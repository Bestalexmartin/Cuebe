# backend/routers/shows.py

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["shows", "scripts"])


# =============================================================================
# SHOW ENDPOINTS
# =============================================================================

@router.post("/shows/", response_model=schemas.Show)
async def create_show(
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


@router.get("/me/shows", response_model=list[schemas.Show])
async def read_shows_for_current_user(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db), 
    skip: int = 0,
    limit: int = 100
):
    """Get all shows owned by the current user."""
    shows = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue)
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
    show_to_update.dateUpdated = datetime.utcnow() # type: ignore
    
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

@router.post("/shows/{show_id}/scripts/", response_model=schemas.Script)
async def create_script_for_show(
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
        scriptStatus=models.ScriptStatus(script.scriptStatus) if script.scriptStatus else models.ScriptStatus.DRAFT,
        startTime=show.showDate,  # Inherit show datetime as start time
        ownerID=user.userID
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

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
    script.dateUpdated = datetime.utcnow() # type: ignore
    
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