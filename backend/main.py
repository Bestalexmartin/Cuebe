# backend/main.py

import json
import os
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError

# Import our custom modules
import models
import schemas
from database import get_db, engine

# This command is useful for initial development to ensure tables exist.
# In a robust production setup, Alembic would be the sole manager of the schema.
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#
# HEALTH CHECK
#
@app.get("/api/health")
def read_root():
    return {"status": "ok"}

#
# CREATE A NEW SHOW
#
@app.post("/api/shows/", response_model=schemas.Show) # <-- This must be @app.post
def create_show(show: schemas.ShowCreate, db: Session = Depends(get_db)):
    current_user_id = 1  # Placeholder

    new_show = models.Show(
        showName=show.showName,
        showVenue=show.showVenue,
        showDate=show.showDate,
        ownerID=current_user_id
    )
    
    db.add(new_show)
    db.commit()
    db.refresh(new_show)
    
    return new_show

#
# GET A LIST OF SHOWS
#
@app.get("/api/shows/", response_model=list[schemas.Show]) # <-- This is @app.get
def read_shows(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    shows = db.query(models.Show).offset(skip).limit(limit).all()
    return shows

#
# CLERK WEBHOOK HANDLER (Using Svix)
#
@app.post("/api/webhooks/clerk")
async def handle_clerk_webhook(request: Request, db: Session = Depends(get_db)):
    # Get the Svix headers for verification
    headers = request.headers
    
    # Get the raw request body
    payload = await request.body()

    # Get the webhook secret from your environment variables
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        # Create a new Webhook instance with your secret
        wh = Webhook(webhook_secret)
        
        # Verify the payload with the headers
        event = wh.verify(payload, dict(headers))

    except WebhookVerificationError as e:
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    # Get the event type and data
    event_type = event['type']
    user_data = event['data']

    if event_type == 'user.created':
        user_data = event['data']
        email = user_data.get('email_addresses', [{}])[0].get('email_address')
        new_clerk_id = user_data.get('id')

        # Find if a user with this email already exists
        existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()

        if existing_user:
            if existing_user.isActive is False:
                # If an inactive user exists, reactivate and update them
                existing_user.isActive = True    # type: ignore
                existing_user.clerk_user_id = new_clerk_id
                existing_user.userName = user_data.get('username')
                existing_user.fullnameFirst = user_data.get('first_name')
                existing_user.fullnameLast = user_data.get('last_name')
                existing_user.profileImgURL = user_data.get('image_url')
            else:
                # An active user with this email already exists
                print(f"User with email {email} already exists and is active. Skipping creation.")
        else:
            # If no user with that email exists, create a new one
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

    elif event_type == 'user.deleted':
        clerk_id_to_delete = user_data.get('id')
        if clerk_id_to_delete:
            user_to_deactivate = db.query(models.User).filter(models.User.clerk_user_id == clerk_id_to_delete).first()
            if user_to_deactivate:
                # Instead of deleting, we set the user to inactive
                user_to_deactivate.isActive = False   # type: ignore
                db.commit()

    return {"status": "ok", "message": f"Received {event_type} event"}