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
        print(f"Svix webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    # Get the event type and data
    event_type = event['type']
    user_data = event['data']
    
    print(f"Received webhook for event: {event_type}")

    # Your logic for user.created, user.updated, etc. remains the same
    if event_type == 'user.created':
        # ... your user creation logic ...
        new_user = models.User(
            clerk_user_id=user_data.get('id'),
            emailAddress=user_data.get('email_addresses', [{}])[0].get('email_address'),
            userName=user_data.get('username'),
            fullnameFirst=user_data.get('first_name'),
            fullnameLast=user_data.get('last_name'),
            profileImgURL=user_data.get('image_url')
        )
        db.add(new_user)
        db.commit()
        print(f"User {user_data.get('id')} successfully created in local DB.")

    return {"status": "ok", "message": f"Received {event_type} event"}