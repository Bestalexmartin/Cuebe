# backend/routers/shows.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime, timezone
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

router = APIRouter(prefix="/api", tags=["shows", "scripts"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


# =============================================================================
# SHOW ENDPOINTS
# =============================================================================

@rate_limit(RateLimitConfig.CRUD_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.post("/shows/", response_model=schemas.Show)
async def create_show(
    request: Request,
    show: schemas.ShowCreate, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(get_current_user)
):
    """Create a new show with a default first draft script."""
    new_show = models.Show(
        showName=show.showName,
        venueID=show.venueID,
        showDate=show.showDate,
        showNotes=show.showNotes,
        deadline=show.deadline,
        ownerID=user.userID
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)

    # Create first draft script
    first_draft = models.Script(
        scriptName="First Draft",
        showID=new_show.showID,
        ownerID=user.userID
    )
    db.add(first_draft)
    db.commit()
    
    return new_show


@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.get("/me/shows", response_model=list[schemas.Show])
async def read_shows_for_current_user(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db), 
    skip: int = 0,
    limit: int = 100
):
    """Get all shows owned by the current user - optimized for dashboard cards."""
    shows = db.query(models.Show).options(
        joinedload(models.Show.scripts),  # Load basic script info (name, status, dates) but not elements
        joinedload(models.Show.venue)     # Load venue for venue name display
    ).filter(models.Show.ownerID == user.userID).offset(skip).limit(limit).all()
    
    return shows


@router.get("/shows/{show_id}", response_model=schemas.Show)
async def read_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single show by ID."""
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
    if show.ownerID != user.userID: # type: ignore
        logger.warning(f"User {user.userID} attempted to access show {show_id} without permission")
        raise HTTPException(status_code=403, detail="Not authorized to view this show")

    return show


@router.patch("/shows/{show_id}", response_model=schemas.Show)
async def update_show(
    show_id: UUID,
    show_update: schemas.ShowCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a show."""
    show_to_update = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show_to_update:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security check
    if show_to_update.ownerID != user.userID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to update this show")

    update_data = show_update.model_dump(exclude_unset=True)
    logger.info(f"Updating show {show_id} with data: {update_data}")

    for key, value in update_data.items():
        setattr(show_to_update, key, value)
    
    # Update the dateUpdated timestamp
    setattr(show_to_update, 'dateUpdated', datetime.now(timezone.utc))
    
    db.commit()
    db.refresh(show_to_update)
    
    return show_to_update


@router.delete("/shows/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a show and all associated scripts."""
    show_to_delete = db.query(models.Show).filter(
        models.Show.showID == show_id,
        models.Show.ownerID == user.userID
    ).first()
    if not show_to_delete:
        raise HTTPException(status_code=404, detail="Show not found")

    # Delete all scripts associated with this show
    scripts_to_delete = db.query(models.Script).filter(
        models.Script.showID == show_id,
        models.Script.ownerID == user.userID
    ).all()
    
    script_count = len(scripts_to_delete)
    
    # Delete script elements first (due to foreign key constraints)
    for script in scripts_to_delete:
        script_elements = db.query(models.ScriptElement).filter(
            models.ScriptElement.scriptID == script.scriptID
        ).all()
        for element in script_elements:
            db.delete(element)
    
    # Delete scripts
    for script in scripts_to_delete:
        db.delete(script)
    
    # Log the cleanup for debugging
    if script_count > 0:
        logger.info(f"Deleted {script_count} scripts and their elements when deleting show {show_id}")
    
    # Finally delete the show
    db.delete(show_to_delete)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =============================================================================
# SCRIPT ENDPOINTS
# =============================================================================

@rate_limit(RateLimitConfig.CRUD_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.post("/shows/{show_id}/scripts/", response_model=schemas.Script)
async def create_script_for_show(
    request: Request,
    show_id: UUID,
    script: schemas.ScriptCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new script for a show."""
    # Find the show this script will belong to
    show = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security Check: Make sure the current user owns this show
    if show.ownerID != user.userID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to add a script to this show")

    # Create the new script
    new_script = models.Script(
        showID=show_id,
        scriptName=script.scriptName or "New Script",
        scriptStatus=models.ScriptStatus(script.scriptStatus) if script.scriptStatus is not None else models.ScriptStatus.DRAFT,
        startTime=show.showDate,  # Inherit show datetime as start time
        ownerID=user.userID
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    # Create automatic "Show Start" cue with minimal required fields
    from datetime import timedelta
    show_start_cue = models.ScriptElement(
        scriptID=new_script.scriptID,
        elementType=models.ElementType.CUE,
        cueID=None,  # No cue ID needed for show start
        description="SHOW START",  # All caps title
        timeOffsetMs=0,  # Start at 00:00
        triggerType=models.TriggerType.MANUAL,
        executionStatus=models.ExecutionStatus.PENDING,
        priority=models.PriorityLevel.CRITICAL,
        customColor="#DC2626",
        sequence=1,
        elementOrder=1,
        isActive=True,
        groupLevel=0,
        isSafetyCritical=False,
        createdBy=user.userID
        # departmentID intentionally left out (None/NULL)
    )
    db.add(show_start_cue)
    db.commit()

    return new_script


@router.get("/scripts/{script_id}", response_model=schemas.Script)
async def get_script(
    script_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single script by ID."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show),
        joinedload(models.Script.elements)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through direct ownership or show ownership)
    if script.ownerID != user.userID and script.show.ownerID != user.userID: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this script"
        )
    
    return script


@router.patch("/scripts/{script_id}", response_model=schemas.Script)
async def update_script(
    script_id: UUID,
    script_update: schemas.ScriptUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a script's metadata."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.ownerID != user.userID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this script"
        )
    
    # Update only the fields that were provided
    update_data = script_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if hasattr(script, field):
            setattr(script, field, value)
    
    # Update the dateUpdated timestamp
    setattr(script, 'dateUpdated', datetime.now(timezone.utc))
    
    try:
        db.commit()
        db.refresh(script)
        return script
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update script {script_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update script: {str(e)}"
        )


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a script and all its elements."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.ownerID != user.userID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this script"
        )
    
    try:
        # Delete the script (cascade will handle script elements)
        db.delete(script)
        db.commit()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete script {script_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete script: {str(e)}"
        )