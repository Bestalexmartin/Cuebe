# backend/routers/webhooks.py

import os
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from svix.webhooks import Webhook, WebhookVerificationError
import logging

import models
from database import get_db

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    limiter = None
    RateLimitConfig = None
    RATE_LIMITING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["webhooks"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


# =============================================================================
# CLERK WEBHOOK
# =============================================================================

@router.post("/webhooks/clerk")
@rate_limit(RateLimitConfig.WEBHOOKS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
async def handle_clerk_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Clerk authentication webhooks for user lifecycle management."""
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

        if existing_user:
            # Update existing user (whether active guest or inactive user)
            setattr(existing_user, 'isActive', True)
            existing_user.clerk_user_id = new_clerk_id
            existing_user.userName = user_data.get('username')
            setattr(existing_user, 'userStatus', models.UserStatus.VERIFIED)
            # Update name and profile if provided by Clerk and not already set
            if user_data.get('first_name') and not bool(existing_user.fullnameFirst):
                existing_user.fullnameFirst = user_data.get('first_name')
            if user_data.get('last_name') and not bool(existing_user.fullnameLast):
                existing_user.fullnameLast = user_data.get('last_name')
            if user_data.get('image_url'):
                existing_user.profileImgURL = user_data.get('image_url')
        else:
            logger.info(f"Creating new user for email: {email}")
            new_user = models.User(
                clerk_user_id=new_clerk_id,
                emailAddress=email,
                userName=user_data.get('username'),
                fullnameFirst=user_data.get('first_name'),
                fullnameLast=user_data.get('last_name'),
                profileImgURL=user_data.get('image_url'),
                userStatus=models.UserStatus.VERIFIED,
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
                setattr(user_to_deactivate, 'isActive', False)
                db.commit()
                logger.info(f"User {clerk_id_to_delete} deactivated.")
    
    return {"status": "ok"}