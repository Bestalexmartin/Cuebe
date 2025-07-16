# backend/main.py

import os
import json
import time
import secrets
from typing import Dict
from uuid import UUID
import logging

from fastapi import FastAPI, Depends, Request, HTTPException, Header, Response, status

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from jose import jwt
from svix.webhooks import Webhook, WebhookVerificationError
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import local modules
import models
import schemas
from database import get_db, engine

# This creates tables on startup. Good for dev, but Alembic is the main tool.
models.Base.metadata.create_all(bind=engine)

# --- App Initialization ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Dependencies ---
bearer_scheme = HTTPBearer()

async def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> Dict:
    pem_key_str = os.getenv("CLERK_PEM_PUBLIC_KEY")
    if not pem_key_str:
        raise HTTPException(status_code=500, detail="Missing PEM Public Key")

    pem_key = pem_key_str.replace("\\n", "\n")
    token = credentials.credentials

    try:
        decoded_claims = jwt.decode(
            token,
            pem_key,
            algorithms=["RS256"],
            options={"verify_signature": True}
        )
        current_time = time.time()
        if decoded_claims.get("exp", 0) < current_time:
            raise HTTPException(status_code=401, detail="Token has expired")
        if decoded_claims.get("nbf", 0) > current_time:
            raise HTTPException(status_code=401, detail="Token not yet valid")
        return decoded_claims
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    claims: Dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> models.User:
    clerk_user_id = claims.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- API Endpoints ---

@app.get("/api/health")
def read_root():
    return {"status": "ok"}

@app.post("/api/shows/", response_model=schemas.Show)
async def create_show(
    show: schemas.ShowCreate, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(get_current_user)
):
    new_show = models.Show(
        showName=show.showName,
        venueID=show.venueID,
        showDate=show.showDate,
        ownerID=user.ID
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)

    first_draft = models.Script(
        scriptName="First Draft",
        showID=new_show.showID
    )
    db.add(first_draft)
    db.commit()
    
    return new_show

@app.get("/api/me/shows", response_model=list[schemas.Show])
async def read_shows_for_current_user(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db), 
    skip: int = 0,
    limit: int = 100
):  
    shows = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue)
    ).filter(models.Show.ownerID == user.ID).offset(skip).limit(limit).all()
    
    return shows

@app.get("/api/shows/{show_id}", response_model=schemas.Show)
async def read_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"Looking for show with UUID: {show_id}")
    show = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue),
        joinedload(models.Show.crew)
    ).filter(models.Show.showID == show_id).first()
    
    if not show:
        logger.warning(f"Show not found in DB: {show_id}")
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Security check: ensure the user owns this show
    if show.ownerID != user.ID:  # type: ignore
        logger.warning(f"User {user.ID} attempted to access show {show_id} without permission")
        raise HTTPException(status_code=403, detail="Not authorized to view this show")

    return show

@app.patch("/api/shows/{show_id}", response_model=schemas.Show)
async def update_show(
    show_id: UUID,
    show_update: schemas.ShowCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    show_to_update = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show_to_update:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security check
    if show_to_update.ownerID != user.ID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to update this show")

    # Convert the incoming data to a dictionary, excluding any fields that weren't set
    update_data = show_update.model_dump(exclude_unset=True)
    logger.info(f"Updating show {show_id} with data: {update_data}")

    # Loop through the provided data and update the database object
    for key, value in update_data.items():
        setattr(show_to_update, key, value)
    
    db.commit()
    db.refresh(show_to_update)
    
    return show_to_update

@app.delete("/api/shows/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    show_to_delete = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show_to_delete:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security check: ensure the user owns this show
    if show_to_delete.ownerID != user.ID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to delete this show")

    # Delete the show from the database
    db.delete(show_to_delete)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.post("/api/webhooks/clerk")
async def handle_clerk_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    headers = request.headers
    payload = await request.body()
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        wh = Webhook(webhook_secret)
        event = wh.verify(payload, dict(headers))
    except WebhookVerificationError as e:
        logger.error(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event['type']
    user_data = event['data']
    
    logger.info(f"Received webhook for event: {event_type}")

    if event_type == 'user.created':
        email = user_data.get('email_addresses', [{}])[0].get('email_address')
        new_clerk_id = user_data.get('id')
        
        existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()

        if existing_user and existing_user.isActive is False:
            logger.info(f"Reactivating user for email: {email}")
            existing_user.isActive = True # type: ignore
            existing_user.clerk_user_id = new_clerk_id
            existing_user.userName = user_data.get('username')
            # ... update other fields ...
        elif not existing_user:
            logger.info(f"Creating new user for email: {email}")
            new_user = models.User(
                clerk_user_id=new_clerk_id,
                emailAddress=email,
                userName=user_data.get('username'),
                fullnameFirst=user_data.get('first_name'),
                fullnameLast=user_data.get('last_name'),
                profileImgURL=user_data.get('image_url'),
                isActive=True
            )
            db.add(new_user)
        
        db.commit()

    elif event_type == 'user.updated':
        user_to_update = db.query(models.User).filter(models.User.clerk_user_id == user_data['id']).first()
        if user_to_update:
            user_to_update.emailAddress = user_data['email_addresses'][0]['email_address']
            user_to_update.userName = user_data.get('username')
            user_to_update.fullnameFirst = user_data.get('first_name')
            user_to_update.fullnameLast = user_data.get('last_name')
            user_to_update.profileImgURL = user_data.get('image_url')
            db.commit()
            logger.info(f"User {user_data['id']} updated.")

    elif event_type == 'user.deleted':
        clerk_id_to_delete = user_data.get('id')
        if clerk_id_to_delete:
            user_to_deactivate = db.query(models.User).filter(models.User.clerk_user_id == clerk_id_to_delete).first()
            if user_to_deactivate:
                user_to_deactivate.isActive = False # type: ignore
                db.commit()
                logger.info(f"User {clerk_id_to_delete} deactivated.")
    
    return {"status": "ok"}

@app.post("/api/shows/{show_id}/guest-links")
def create_guest_link_for_show(
    show_id: UUID,
    request: schemas.GuestLinkCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the show exists and user owns it
    show = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    if show.ownerID != user.ID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to create guest links for this show")
    
    # Verify the department exists
    department = db.query(models.Department).filter(models.Department.departmentID == request.departmentID).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Generate a secure, URL-safe token
    token = secrets.token_urlsafe(32)
    
    new_link = models.GuestAccessLink(
        accessToken=token,
        showID=show_id,
        departmentID=request.departmentID,
        linkName=request.linkName
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return {"guest_access_url": f"/guest/{token}"}

@app.get("/api/guest/{access_token}", response_model=list[schemas.ScriptElement])
def get_script_for_guest(access_token: str, db: Session = Depends(get_db)):
    # Find the link in the database
    link = db.query(models.GuestAccessLink).filter(models.GuestAccessLink.accessToken == access_token).first()
    
    # Check if link exists and is valid (e.g., not expired)
    if not link:
        raise HTTPException(status_code=404, detail="Access link not found or invalid")
    
    # Check if link is expired
    if link.expiresAt < datetime.now(): # type: ignore
        raise HTTPException(status_code=403, detail="Access link has expired")
        
    # Find the "live" script for the show this link belongs to
    script = db.query(models.Script).filter(
        models.Script.showID == link.showID,
        models.Script.scriptStatus == 'live'
    ).first()

    if not script:
        raise HTTPException(status_code=404, detail="Live script for this show not found")

    # Fetch only the active calls for the department associated with this link
    elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.scriptID == script.scriptID,
        models.ScriptElement.departmentID == link.departmentID,
        models.ScriptElement.isActive == True
    ).order_by(models.ScriptElement.elementOrder).all()

    return elements

@app.get("/api/me/pinned-scripts/count")
async def get_pinned_scripts_count(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # This query now counts pinned scripts belonging to the user's shows
    count = db.query(models.Script).join(models.Show).filter(
        models.Show.ownerID == user.ID,
        models.Script.isPinned == True
    ).count()
    
    return {"pinnedCount": count}

@app.patch("/api/scripts/{script_id}/toggle-pin", response_model=schemas.Script)
async def toggle_pin_for_script(
    script_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the script to be pinned/unpinned
    script = db.query(models.Script).filter(models.Script.scriptID == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    # Security Check: Make sure the logged-in user owns the show this script belongs to
    if script.show.ownerID != user.ID:
        raise HTTPException(status_code=403, detail="Not authorized to modify this script")

    # Toggle the isPinned value
    script.isPinned = not script.isPinned # type: ignore
    db.commit()
    db.refresh(script)

    return script

@app.post("/api/shows/{show_id}/scripts/", response_model=schemas.Script)
async def create_script_for_show(
    show_id: UUID,
    script: schemas.ScriptCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the show this script will belong to
    show = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security Check: Make sure the current user owns this show
    if show.ownerID != user.ID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to add a script to this show")

    # Create the new script with default values
    new_script = models.Script(
        showID=show_id,
        scriptName=script.scriptName or "New Script"
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    return new_script

@app.get("/api/venues/", response_model=list[schemas.Venue])
async def read_venues(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    venues = db.query(models.Venue).all()
    return venues

@app.post("/api/venues/", response_model=schemas.Venue, status_code=status.HTTP_201_CREATED)
async def create_venue(
    venue: schemas.VenueCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_venue = models.Venue(**venue.model_dump())
    db.add(new_venue)
    db.commit()
    db.refresh(new_venue)
    return new_venue