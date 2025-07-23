# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/check-email")
async def check_user_by_email(
    email: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user exists by email address."""
    existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()
    return existing_user


@router.post("/create-guest-with-relationship", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def create_guest_user_with_relationship(
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
        clerk_user_id=None,  # No Clerk integration yet
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