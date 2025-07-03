# backend/main.py

import os
import json
import time
from typing import Dict

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
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event['type']
    user_data = event['data']
    
    # ... (the user create/update/delete logic remains the same) ...

    return {"status": "ok"}