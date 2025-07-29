# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    limiter = None
    RateLimitConfig = None
    RATE_LIMITING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.get("/check-email")
async def check_user_by_email(
    request: Request,
    email: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user exists by email address."""
    existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()
    return existing_user


@router.post("/create-guest-with-relationship", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
@rate_limit(RateLimitConfig.AUTH_ENDPOINTS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
async def create_guest_user_with_relationship(
    request: Request,
    guest_data: schemas.GuestUserCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a guest user with crew relationship in an atomic operation."""
    # Double-check user doesn't already exist
    existing_user = db.query(models.User).filter(models.User.emailAddress == guest_data.emailAddress).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new guest user
    new_guest_user = models.User(
        emailAddress=guest_data.emailAddress,
        fullnameFirst=guest_data.fullnameFirst,
        fullnameLast=guest_data.fullnameLast,
        userRole=guest_data.userRole,
        userStatus=models.UserStatus.GUEST,  # Explicitly set as guest
        phoneNumber=guest_data.phoneNumber,
        notes=None,  # Notes belong in the relationship, not the user
        createdBy=user.userID,  # Track who created this guest user
        clerk_user_id=None,  # Clerk user ID will be set when webhooks sync data
        userName=None,
        profileImgURL=None,
        isActive=True
    )
    db.add(new_guest_user)
    db.flush()  # Get the ID without committing
    
    # Create crew relationship
    crew_relationship = models.CrewRelationship(
        manager_user_id=user.userID,
        crew_user_id=new_guest_user.userID,
        notes=guest_data.notes
    )
    db.add(crew_relationship)
    
    # Commit both operations
    db.commit()
    db.refresh(new_guest_user)
    
    return new_guest_user