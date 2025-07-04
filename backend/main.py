# backend/main.py

import os
import json
import time
import secrets
from typing import Dict
from uuid import UUID

from fastapi import FastAPI, Depends, Request, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt
from svix.webhooks import Webhook, WebhookVerificationError


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

# --- Authentication Dependency ---
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
        print(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- API Endpoints ---

@app.get("/api/health")
def read_root():
    return {"status": "ok"}

@app.post("/api/shows/", response_model=schemas.Show)
async def create_show(
    show: schemas.ShowCreate, 
    db: Session = Depends(get_db), 
    claims: Dict = Depends(get_current_user_claims)
):
    clerk_user_id = claims.get("sub") # The correct key is "sub"
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in local database")

    new_show = models.Show(
        showName=show.showName,
        showVenue=show.showVenue,
        showDate=show.showDate,
        ownerID=user.ID
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)
    return new_show

@app.get("/api/me/shows", response_model=list[schemas.Show])
async def read_shows_for_current_user(
    db: Session = Depends(get_db), 
    claims: Dict = Depends(get_current_user_claims),
    skip: int = 0, 
    limit: int = 100
):
    clerk_user_id = claims.get("sub") # The correct key is "sub"
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    shows = db.query(models.Show).filter(models.Show.ownerID == user.ID).offset(skip).limit(limit).all()
    return shows

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
        print(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event['type']
    user_data = event['data']
    
    print(f"Received webhook for event: {event_type}")

    if event_type == 'user.created':
        email = user_data.get('email_addresses', [{}])[0].get('email_address')
        new_clerk_id = user_data.get('id')
        
        existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()

        if existing_user and existing_user.isActive is False:
            print(f"Reactivating user for email: {email}")
            existing_user.isActive = True # type: ignore
            existing_user.clerk_user_id = new_clerk_id
            existing_user.userName = user_data.get('username')
            # ... update other fields ...
        elif not existing_user:
            print(f"Creating new user for email: {email}")
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
            print(f"User {user_data['id']} updated.")

    elif event_type == 'user.deleted':
        clerk_id_to_delete = user_data.get('id')
        if clerk_id_to_delete:
            user_to_deactivate = db.query(models.User).filter(models.User.clerk_user_id == clerk_id_to_delete).first()
            if user_to_deactivate:
                user_to_deactivate.isActive = False  # type: ignore
                db.commit()
                print(f"User {clerk_id_to_delete} deactivated.")
    
    return {"status": "ok"}

#
# CREATE A GUEST ACCESS LINK (Protected)
#
@app.post("/api/shows/{show_id}/guest-links", dependencies=[Depends(get_current_user_claims)])
def create_guest_link_for_show(
    show_id: UUID,
    department_id: int,
    db: Session = Depends(get_db),
    claims: Dict = Depends(get_current_user_claims)
):
    # (Add logic here to ensure the current user owns this show)
    
    # Generate a secure, URL-safe token
    token = secrets.token_urlsafe(32)
    
    new_link = models.GuestAccessLink(
        accessToken=token,
        showID=show_id,
        departmentID=department_id
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return {"guest_access_url": f"/guest/{token}"}


#
# GET SCRIPT ELEMENTS FOR A GUEST (Public)
#
@app.get("/api/guest/{access_token}", response_model=list[schemas.ScriptElement])
def get_script_for_guest(access_token: str, db: Session = Depends(get_db)):
    # Find the link in the database
    link = db.query(models.GuestAccessLink).filter(models.GuestAccessLink.accessToken == access_token).first()
    
    # Check if link exists and is valid (e.g., not expired)
    if not link:
        raise HTTPException(status_code=404, detail="Access link not found or invalid")
        
    # Find the "live" script for the show this link belongs to
    script = db.query(models.Script).filter(
        models.Script.showID == link.showID,
        models.Script.scriptStatus == 'live'
    ).first()

    if not script:
        raise HTTPException(status_code=404, detail="Live script for this show not found")

    # Fetch only the calls for the department associated with this link
    elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.scriptID == script.scriptID,
        models.ScriptElement.departmentID == link.departmentID
    ).order_by(models.ScriptElement.elementOrder).all()

    return elements