# backend/routers/show_sharing.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
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
from .docs_search import get_content_directory, search_documents, SearchResponse

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
    force_refresh: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create or retrieve a show-level sharing link for a crew member"""
    
    logger.info(f"🔄 create_or_get_show_share called with force_refresh={force_refresh}")
    
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
    
    logger.info(f"🔍 Accessing shared show with token: {share_token[:8]}...")
    
    try:
        # Find the crew assignment by share token, eager load user
        crew_assignment = db.query(models.CrewAssignment).options(
            joinedload(models.CrewAssignment.user)
        ).filter(
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
        # Get the show with proper joins, filtering scripts and elements at DB level
        show = db.query(models.Show).options(
            joinedload(models.Show.scripts.and_(models.Script.is_shared == True)).joinedload(
                models.Script.elements.and_(models.ScriptElement.department_id == crew_assignment.department_id)
            ),
            joinedload(models.Show.venue)
        ).filter(models.Show.show_id == crew_assignment.show_id).first()
        
        if not show:
            logger.error(f"Show not found for crew assignment: {crew_assignment.show_id}")
            raise HTTPException(status_code=404, detail="Show not found")
        
        # Get the user info for metadata (from eager load)
        user = crew_assignment.user
        if not user:
            logger.error(f"User not found for crew assignment: {crew_assignment.user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update access tracking
        crew_assignment.access_count += 1
        crew_assignment.last_accessed_at = models.func.now()
        db.commit()
        
        logger.info(f"Successfully processed share token access: {share_token[:8]}...")
        
        logger.info(f"🏢 Department filtering applied at DB level for: {crew_assignment.department_id}")
        
        # Return the show with department-filtered elements
        return schemas.SharedShowResponse(
            shows=[show],
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


@router.get("/shared/{share_token}/tutorials/search", response_model=SearchResponse)
async def search_shared_tutorials(
    share_token: str,
    q: str = Query(..., description="Search query"),
    limit: int = Query(12, ge=1, le=50, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """Search tutorials via share token (public endpoint, no auth required)"""
    
    try:
        # Verify the share token is valid
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if not crew_assignment:
            logger.warning(f"Invalid share token for tutorial search: {share_token}")
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        # Search only tutorial content
        results = search_documents(q, limit, content_type="tutorial")
        
        logger.info(f"Tutorial search via share token: query='{q}', results={len(results)}")
        
        return SearchResponse(
            results=results,
            total_results=len(results),
            query=q
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error searching tutorials via share token {share_token}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.get("/shared/{share_token}/tutorials/{tutorial_path:path}")
async def get_shared_tutorial(
    share_token: str,
    tutorial_path: str,
    db: Session = Depends(get_db)
):
    """Get tutorial content via share token (public endpoint, no auth required)"""
    
    try:
        # Verify the share token is valid
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.is_active == True
        ).first()
        
        if not crew_assignment:
            logger.warning(f"Invalid share token for tutorial access: {share_token}")
            raise HTTPException(status_code=404, detail="Share not found or expired")
        
        # Get tutorial content
        tutorials_dir = get_content_directory("tutorials")
        if not tutorials_dir.exists():
            raise HTTPException(status_code=503, detail="Tutorial content not available")
        
        tutorial_file = tutorials_dir / tutorial_path
        if not tutorial_file.exists() or not tutorial_file.suffix == '.md':
            raise HTTPException(status_code=404, detail="Tutorial not found")
        
        # Ensure the requested file is within the tutorials directory (security check)
        try:
            tutorial_file.resolve().relative_to(tutorials_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Read tutorial content
        with open(tutorial_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        logger.info(f"Tutorial accessed via share token: {tutorial_path}")
        
        return {"content": content, "path": tutorial_path}
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error accessing tutorial via share token {share_token}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
