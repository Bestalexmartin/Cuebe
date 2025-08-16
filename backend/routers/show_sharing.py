# backend/routers/show_sharing.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
import secrets
import string
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user
from utils.user_preferences import (
    bitmap_to_preferences,
    preferences_to_bitmap_updates,
    validate_preferences,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["show-sharing"])

def generate_share_token(length: int = 32) -> str:
    """Generate a secure random token for sharing"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/shows/{show_id}/crew/{user_id}/share", response_model=schemas.ShareTokenResponse)
async def create_or_get_show_share(
    show_id: UUID,
    user_id: UUID,
    force_refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create or retrieve a show-level sharing link for a crew member"""
    
    # Get the show and verify ownership
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    if show.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this show")
    
    # Find the crew assignment for this show/user combination
    crew_assignment = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.show_id == show_id,
        models.CrewAssignment.user_id == user_id,
        models.CrewAssignment.is_active == True
    ).first()
    
    if not crew_assignment:
        raise HTTPException(status_code=404, detail="Crew assignment not found for this show and user")
    
    # Only generate new share token if one doesn't exist or if force_refresh is True
    if not crew_assignment.share_token:
        crew_assignment.share_token = generate_share_token()
        action = "created"
    elif force_refresh:
        crew_assignment.share_token = generate_share_token()
        action = "refreshed"
    else:
        action = "retrieved"  # Token already exists, just return it
    
    db.commit()
    db.refresh(crew_assignment)
    
    logger.info(f"{action.title()} show share token for user {user_id} on show {show_id}")
    
    return schemas.ShareTokenResponse(
        assignment_id=crew_assignment.assignment_id,
        share_token=crew_assignment.share_token,
        share_url=f"/shared/{crew_assignment.share_token}",
        action=action
    )


@router.get("/shared/{share_token}", response_model=schemas.SharedShowResponse)
async def access_shared_show(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Access a shared show via token (public endpoint, no auth required)"""
    
    try:
        # Find the crew assignment by share token
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if not crew_assignment:
            logger.warning(f"Share token not found: {share_token}")
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        logger.info(f"Found crew assignment for share token: {share_token[:8]}...")
    except Exception as e:
        logger.error(f"Database error finding share token {share_token}: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    
    try:
        # Get the show with proper joins - EXACTLY like the working /api/me/shows endpoint
        show = db.query(models.Show).options(
            joinedload(models.Show.scripts),  # Load scripts 
            joinedload(models.Show.venue)     # Load venue for venue name display
        ).filter(models.Show.show_id == crew_assignment.show_id).first()
        
        if not show:
            logger.error(f"Show not found for crew assignment: {crew_assignment.show_id}")
            raise HTTPException(status_code=404, detail="Show not found")
        
        # Filter scripts to only shared ones (modify the loaded scripts in place)
        show.scripts = [script for script in show.scripts if script.is_shared]
        
        # Get the user info for metadata
        user = db.query(models.User).filter(models.User.user_id == crew_assignment.user_id).first()
        if not user:
            logger.error(f"User not found for crew assignment: {crew_assignment.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update access tracking
        crew_assignment.access_count += 1
        crew_assignment.last_accessed_at = models.func.now()
        db.commit()
        
        logger.info(f"Successfully processed share token access: {share_token[:8]}...")
        
        # Return using the same structure as the working endpoint - let Pydantic handle serialization
        return schemas.SharedShowResponse(
            shows=[show],  # Return the actual SQLAlchemy model - Pydantic will serialize it
            user_name=f"{user.fullname_first} {user.fullname_last}".strip(),
            user_profile_image=user.profile_img_url,
            share_expires=None  # TODO: Add expiration logic if needed
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error processing share token {share_token}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get("/shared/{share_token}/preferences", response_model=dict)
async def get_guest_user_preferences(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Get guest user preferences via share token (public endpoint, no auth required)"""
    
    try:
        # Find the crew assignment by share token
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if not crew_assignment:
            logger.warning(f"Share token not found for preferences: {share_token}")
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        # Get the user associated with this share token
        user = db.query(models.User).filter(models.User.user_id == crew_assignment.user_id).first()
        if not user:
            logger.error(f"User not found for crew assignment: {crew_assignment.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert bitmap to preferences and return
        bitmap = user.user_prefs_bitmap if user.user_prefs_bitmap is not None else 0
        preferences = bitmap_to_preferences(bitmap)
        
        logger.info(f"Retrieved guest preferences for share token: {share_token[:8]}...")
        return preferences
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error retrieving guest preferences for {share_token}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.patch("/shared/{share_token}/preferences", response_model=dict)
async def update_guest_user_preferences(
    share_token: str,
    preference_updates: dict,
    db: Session = Depends(get_db)
):
    """Update guest user preferences via share token (public endpoint, no auth required)"""
    
    try:
        # Find the crew assignment by share token
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if not crew_assignment:
            logger.warning(f"Share token not found for preferences update: {share_token}")
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        # Get the user associated with this share token
        user = db.query(models.User).filter(models.User.user_id == crew_assignment.user_id).first()
        if not user:
            logger.error(f"User not found for crew assignment: {crew_assignment.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate the preference updates
        validation_errors = validate_preferences(preference_updates)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid preferences: {validation_errors}"
            )
        
        # Get current bitmap
        current_bitmap = user.user_prefs_bitmap if user.user_prefs_bitmap is not None else 0
        
        # Apply updates to bitmap
        updated_bitmap = preferences_to_bitmap_updates(current_bitmap, preference_updates)
        
        # Save to database
        user.user_prefs_bitmap = updated_bitmap
        db.commit()
        
        # Return updated preferences
        updated_preferences = bitmap_to_preferences(updated_bitmap)
        
        logger.info(f"Updated guest preferences for share token: {share_token[:8]}...")
        return updated_preferences
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error updating guest preferences for {share_token}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")