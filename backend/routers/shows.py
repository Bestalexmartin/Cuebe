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
def create_show(
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
def read_shows_for_current_user(
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
def read_show(
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
def update_show(
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
def delete_show(
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
def create_script_for_show(
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
        startTime=show.showDate,
        endTime=show.showDuration if show.showDuration else None,
        ownerID=user.userID
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    # Create automatic "Show Start" cue with minimal required fields
    from datetime import timedelta
    show_start_cue = models.ScriptElement(
        scriptID=new_script.scriptID,
        elementType=models.ElementType.NOTE,
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


@rate_limit(RateLimitConfig.CRUD_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.post("/scripts/{script_id}/duplicate", response_model=schemas.Script)
def duplicate_script(
    request: Request,
    script_id: UUID,
    script: schemas.ScriptCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Duplicate an existing script with all its elements and relationships."""
    # Find the original script
    original_script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not original_script:
        raise HTTPException(status_code=404, detail="Original script not found")

    # Security Check: Make sure the current user owns the show
    if original_script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to duplicate this script")

    # Create the new script
    new_script = models.Script(
        showID=original_script.showID,
        scriptName=script.scriptName or f"{original_script.scriptName} copy",
        scriptStatus=models.ScriptStatus(script.scriptStatus) if script.scriptStatus is not None else models.ScriptStatus.COPY,
        startTime=original_script.startTime,
        endTime=original_script.endTime,
        scriptNotes=original_script.scriptNotes,
        ownerID=user.userID
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    # Get all elements for the original script
    original_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.scriptID == script_id
    ).all()

    # Track element ID mapping for relationships
    element_id_mapping = {}

    # Duplicate all script elements
    for original_element in original_elements:
        new_element = models.ScriptElement(
            scriptID=new_script.scriptID,
            elementType=original_element.elementType,
            departmentID=original_element.departmentID,
            parentElementID=None,  # Will be updated later for hierarchical elements
            cueID=original_element.cueID,
            cueNumber=original_element.cueNumber,
            description=original_element.description,
            elementDescription=original_element.elementDescription,
            timeOffsetMs=original_element.timeOffsetMs,
            duration=original_element.duration,
            fadeIn=original_element.fadeIn,
            fadeOut=original_element.fadeOut,
            triggerType=original_element.triggerType,
            followsCueID=original_element.followsCueID,
            executionStatus=models.ExecutionStatus.PENDING,  # Reset to pending
            priority=original_element.priority,
            customColor=original_element.customColor,
            departmentColor=original_element.departmentColor,
            sequence=original_element.sequence,
            elementOrder=original_element.elementOrder,
            location=original_element.location,
            locationDetails=original_element.locationDetails,
            isActive=original_element.isActive,
            groupLevel=original_element.groupLevel,
            isCollapsed=original_element.isCollapsed,
            isSafetyCritical=original_element.isSafetyCritical,
            cueNotes=original_element.cueNotes,
            safetyNotes=original_element.safetyNotes,
            version=1,  # Reset version to 1 for new duplicate
            createdBy=user.userID
        )
        db.add(new_element)
        db.commit()
        db.refresh(new_element)
        
        # Store mapping for relationship updates
        element_id_mapping[original_element.elementID] = new_element.elementID

    # Duplicate all related data separately to avoid complex joins
    # Duplicate equipment relationships
    original_equipment = db.query(models.ScriptElementEquipment).join(
        models.ScriptElement
    ).filter(models.ScriptElement.scriptID == script_id).all()
    
    for equipment in original_equipment:
        if equipment.elementID in element_id_mapping:
            new_equipment = models.ScriptElementEquipment(
                elementID=element_id_mapping[equipment.elementID],
                equipmentName=equipment.equipmentName,
                isRequired=equipment.isRequired,
                notes=equipment.notes
            )
            db.add(new_equipment)

    # Duplicate crew assignments
    original_crew_assignments = db.query(models.ScriptElementCrewAssignment).join(
        models.ScriptElement
    ).filter(models.ScriptElement.scriptID == script_id).all()
    
    for crew_assignment in original_crew_assignments:
        if crew_assignment.elementID in element_id_mapping:
            new_crew_assignment = models.ScriptElementCrewAssignment(
                elementID=element_id_mapping[crew_assignment.elementID],
                crewID=crew_assignment.crewID,
                assignmentRole=crew_assignment.assignmentRole,
                isLead=crew_assignment.isLead
            )
            db.add(new_crew_assignment)

    # Duplicate performer assignments
    original_performer_assignments = db.query(models.ScriptElementPerformerAssignment).join(
        models.ScriptElement
    ).filter(models.ScriptElement.scriptID == script_id).all()
    
    for performer_assignment in original_performer_assignments:
        if performer_assignment.elementID in element_id_mapping:
            new_performer_assignment = models.ScriptElementPerformerAssignment(
                elementID=element_id_mapping[performer_assignment.elementID],
                performerID=performer_assignment.performerID,
                characterName=performer_assignment.characterName,
                notes=performer_assignment.notes
            )
            db.add(new_performer_assignment)

    # Duplicate conditional rules
    original_conditional_rules = db.query(models.ScriptElementConditionalRule).join(
        models.ScriptElement
    ).filter(models.ScriptElement.scriptID == script_id).all()
    
    for conditional_rule in original_conditional_rules:
        if conditional_rule.elementID in element_id_mapping:
            new_conditional_rule = models.ScriptElementConditionalRule(
                elementID=element_id_mapping[conditional_rule.elementID],
                conditionType=conditional_rule.conditionType,
                operator=conditional_rule.operator,
                conditionValue=conditional_rule.conditionValue,
                description=conditional_rule.description,
                isActive=conditional_rule.isActive
            )
            db.add(new_conditional_rule)

    # Second pass: Update parent relationships and group relationships
    for original_element in original_elements:
        new_element_id = element_id_mapping[original_element.elementID]
        
        # Update parent element relationships
        if original_element.parentElementID and original_element.parentElementID in element_id_mapping:
            new_parent_id = element_id_mapping[original_element.parentElementID]
            db.query(models.ScriptElement).filter(
                models.ScriptElement.elementID == new_element_id
            ).update({"parentElementID": new_parent_id})

    # Duplicate group relationships
    original_group_relationships = db.query(models.ScriptElementGroup).join(
        models.ScriptElement, models.ScriptElementGroup.groupID == models.ScriptElement.elementID
    ).filter(models.ScriptElement.scriptID == script_id).all()
    
    for group_rel in original_group_relationships:
        if group_rel.groupID in element_id_mapping and group_rel.childElementID in element_id_mapping:
            new_group_rel = models.ScriptElementGroup(
                groupID=element_id_mapping[group_rel.groupID],
                childElementID=element_id_mapping[group_rel.childElementID],
                orderInGroup=group_rel.orderInGroup
            )
            db.add(new_group_rel)

    db.commit()
    return new_script


@router.get("/scripts/{script_id}", response_model=schemas.Script)
def get_script(
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
def update_script(
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
def delete_script(
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