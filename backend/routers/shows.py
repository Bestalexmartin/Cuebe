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
        show_name=show.show_name,
        venue_id=show.venue_id,
        show_date=show.show_date,
        show_notes=show.show_notes,
        deadline=show.deadline,
        owner_id=user.user_id
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)

    # Create first draft script
    first_draft = models.Script(
        script_name="First Draft",
        show_id=new_show.show_id,
        owner_id=user.user_id
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
    ).filter(models.Show.owner_id == user.user_id).offset(skip).limit(limit).all()
    
    return shows


@router.get("/shows/{show_id}", response_model=schemas.Show)
def read_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single show by ID."""
    show = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue),
        joinedload(models.Show.crew)
    ).filter(models.Show.show_id == show_id).first()
    
    if not show:
        logger.warning(f"Show not found in DB: {show_id}")
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Security check: ensure the user owns this show
    if show.owner_id != user.user_id:
        logger.warning(f"User {user.user_id} attempted to access show {show_id} without permission")
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
    show_to_update = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show_to_update:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security check
    if show_to_update.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this show")

    update_data = show_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(show_to_update, key, value)
    
    # Update the date_updated timestamp
    setattr(show_to_update, 'date_updated', datetime.now(timezone.utc))
    
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
        models.Show.show_id == show_id,
        models.Show.owner_id == user.user_id
    ).first()
    if not show_to_delete:
        raise HTTPException(status_code=404, detail="Show not found")

    # Delete all scripts associated with this show
    scripts_to_delete = db.query(models.Script).filter(
        models.Script.show_id == show_id,
        models.Script.owner_id == user.user_id
    ).all()
    
    script_count = len(scripts_to_delete)
    
    # Delete script elements first (due to foreign key constraints)
    for script in scripts_to_delete:
        script_elements = db.query(models.ScriptElement).filter(
            models.ScriptElement.script_id == script.script_id
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
# CREW ASSIGNMENT ENDPOINTS
# =============================================================================

@router.put("/shows/{show_id}/crew-assignments", response_model=list[schemas.CrewAssignment])
def update_show_crew_assignments(
    show_id: UUID,
    crew_data: schemas.CrewAssignmentBulkRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Replace all crew assignments for a show with the provided assignments."""
    # Verify show exists and user has permission
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Security check
    if show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this show")
    
    try:
        # Delete all existing assignments for this show
        db.query(models.CrewAssignment).filter(
            models.CrewAssignment.show_id == show_id
        ).delete()
        
        # Create new assignments
        new_assignments = []
        for assignment_data in crew_data.assignments:
            new_assignment = models.CrewAssignment(
                show_id=show_id,
                user_id=assignment_data.user_id,
                department_id=assignment_data.department_id,
                show_role=assignment_data.show_role,
                is_active=assignment_data.is_active
            )
            db.add(new_assignment)
            new_assignments.append(new_assignment)
        
        db.commit()
        
        # Refresh all new assignments to get auto-generated fields
        for assignment in new_assignments:
            db.refresh(assignment)
        
        return new_assignments
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update crew assignments for show {show_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update crew assignments: {str(e)}"
        )


@router.post("/shows/{show_id}/crew-assignments", response_model=schemas.CrewAssignment)
def create_crew_assignment(
    show_id: UUID,
    assignment_data: schemas.CrewAssignmentCreateRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a single crew assignment for a show."""
    # Verify show exists and user has permission
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    if show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this show")
    
    # Check if assignment already exists
    existing = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.show_id == show_id,
        models.CrewAssignment.user_id == assignment_data.user_id,
        models.CrewAssignment.department_id == assignment_data.department_id,
        models.CrewAssignment.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Crew assignment already exists")
    
    try:
        new_assignment = models.CrewAssignment(
            show_id=show_id,
            user_id=assignment_data.user_id,
            department_id=assignment_data.department_id,
            show_role=assignment_data.show_role,
            is_active=True
        )
        
        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)
        
        logger.info(f"Created crew assignment {new_assignment.assignment_id} for show {show_id}")
        return new_assignment
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create crew assignment for show {show_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create crew assignment: {str(e)}"
        )


@router.patch("/crew-assignments/{assignment_id}", response_model=schemas.CrewAssignment)
def update_crew_assignment(
    assignment_id: UUID,
    update_data: schemas.CrewAssignmentUpdateRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a single crew assignment."""
    assignment = db.query(models.CrewAssignment).options(
        joinedload(models.CrewAssignment.show)
    ).filter(models.CrewAssignment.assignment_id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Crew assignment not found")
    
    if assignment.show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this assignment")
    
    try:
        # Update fields that were provided
        if update_data.show_role is not None:
            assignment.show_role = update_data.show_role
        if update_data.is_active is not None:
            assignment.is_active = update_data.is_active
        
        db.commit()
        db.refresh(assignment)
        
        logger.info(f"Updated crew assignment {assignment_id}")
        return assignment
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update crew assignment {assignment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update crew assignment: {str(e)}"
        )


@router.delete("/crew-assignments/{assignment_id}")
def delete_crew_assignment(
    assignment_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single crew assignment."""
    assignment = db.query(models.CrewAssignment).options(
        joinedload(models.CrewAssignment.show)
    ).filter(models.CrewAssignment.assignment_id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Crew assignment not found")
    
    if assignment.show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this assignment")
    
    try:
        db.delete(assignment)
        db.commit()
        
        logger.info(f"Deleted crew assignment {assignment_id}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete crew assignment {assignment_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete crew assignment: {str(e)}"
        )


@router.get("/shows/{show_id}/crew", response_model=list[schemas.CrewMemberWithDetails])
def get_show_crew(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all crew members assigned to a show with their details."""
    # Verify show exists and user has permission
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Security check
    if show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this show's crew")
    
    # Query crew assignments with user and department details
    crew_assignments = db.query(models.CrewAssignment).options(
        joinedload(models.CrewAssignment.user),
        joinedload(models.CrewAssignment.department)
    ).filter(
        models.CrewAssignment.show_id == show_id,
        models.CrewAssignment.is_active == True
    ).all()
    
    # Format the response to match the expected structure
    crew_members = []
    for assignment in crew_assignments:
        crew_members.append({
            "assignment_id": assignment.assignment_id,
            "user_id": assignment.user_id,
            "department_id": assignment.department_id,
            "show_role": assignment.show_role,
            "is_active": assignment.is_active,
            "date_assigned": assignment.date_assigned,
            # User info
            "fullname_first": assignment.user.fullname_first,
            "fullname_last": assignment.user.fullname_last,
            "email_address": assignment.user.email_address,
            "user_status": assignment.user.user_status,
            # Department info
            "department_name": assignment.department.department_name,
            "department_color": assignment.department.department_color,
            "department_initials": assignment.department.department_initials
        })
    
    return crew_members


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
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security Check: Make sure the current user owns this show
    if show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to add a script to this show")

    # Create the new script
    new_script = models.Script(
        show_id=show_id,
        script_name=script.script_name or "New Script",
        script_notes=script.script_notes,  # Include script_notes from the request
        script_status=models.ScriptStatus(script.script_status) if script.script_status is not None else models.ScriptStatus.DRAFT,
        start_time=show.show_date,
        end_time=show.show_end if show.show_end is not None else None,
        owner_id=user.user_id
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    # Create automatic "Show Start" cue with minimal required fields
    from datetime import timedelta
    show_start_cue = models.ScriptElement(
        script_id=new_script.script_id,
        element_type=models.ElementType.NOTE,
        element_name="SHOW START",  # All caps title
        offset_ms=0,  # Start at 00:00
        priority=models.PriorityLevel.CRITICAL,
        custom_color="#EF4444",  # Matches frontend note preset red
        sequence=1,
        group_level=0,
        created_by=user.user_id
        # department_id intentionally left out (None/NULL)
    )
    db.add(show_start_cue)
    
    # Create automatic "Show End" cue if show has an end time
    if show.show_end and show.show_date:
        # Calculate runtime in milliseconds
        runtime_delta = show.show_end - show.show_date
        runtime_ms = int(runtime_delta.total_seconds() * 1000)
        
        show_end_cue = models.ScriptElement(
            script_id=new_script.script_id,
            element_type=models.ElementType.NOTE,
            element_name="SHOW END",  # All caps title
            offset_ms=runtime_ms,  # At calculated runtime
            priority=models.PriorityLevel.CRITICAL,
            custom_color="#EF4444",  # Matches frontend note preset red
            sequence=2,
            group_level=0,
            created_by=user.user_id
            # department_id intentionally left out (None/NULL)
        )
        db.add(show_end_cue)
    
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
    ).filter(models.Script.script_id == script_id).first()
    
    if not original_script:
        raise HTTPException(status_code=404, detail="Original script not found")

    # Security Check: Make sure the current user owns the show
    if original_script.show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to duplicate this script")

    # Create the new script
    new_script = models.Script(
        show_id=original_script.show_id,
        script_name=script.script_name or f"{original_script.script_name} copy",
        script_status=models.ScriptStatus(script.script_status) if script.script_status is not None else models.ScriptStatus.COPY,
        start_time=original_script.start_time,
        end_time=original_script.end_time,
        script_notes=original_script.script_notes,
        owner_id=user.user_id
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    # Get all elements for the original script
    original_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).all()

    # Track element ID mapping for relationships
    element_id_mapping = {}

    # Duplicate all script elements
    for original_element in original_elements:
        new_element = models.ScriptElement(
            script_id=new_script.script_id,
            element_type=original_element.element_type,
            department_id=original_element.department_id,
            parent_element_id=None,  # Will be updated later for hierarchical elements
            element_name=original_element.element_name,
            offset_ms=original_element.offset_ms,
            duration_ms=original_element.duration_ms,
            priority=original_element.priority,
            custom_color=original_element.custom_color,
            sequence=original_element.sequence,
            location_details=original_element.location_details,
            group_level=original_element.group_level,
            is_collapsed=original_element.is_collapsed,
            cue_notes=original_element.cue_notes,
            created_by=user.user_id
        )
        db.add(new_element)
        db.commit()
        db.refresh(new_element)
        
        # Store mapping for relationship updates
        element_id_mapping[original_element.element_id] = new_element.element_id

    # Update parent element relationships (if any exist)
    for original_element in original_elements:
        new_element_id = element_id_mapping[original_element.element_id]
        
        # Update parent element relationships
        if original_element.parent_element_id is not None and original_element.parent_element_id in element_id_mapping:
            new_parent_id = element_id_mapping[original_element.parent_element_id]
            db.query(models.ScriptElement).filter(
                models.ScriptElement.element_id == new_element_id
            ).update({"parent_element_id": new_parent_id})

    # Note: Removed duplication of unused supporting tables:
    # - ScriptElementEquipment
    # - ScriptElementCrewAssignment 
    # - ScriptElementPerformerAssignment
    # - ScriptElementConditionalRule
    # - ScriptElementGroup

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
    ).filter(models.Script.script_id == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through direct ownership or show ownership)
    if script.owner_id != user.user_id and script.show.owner_id != user.user_id:
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
    ).filter(models.Script.script_id == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.owner_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this script"
        )
    
    # Update only the fields that were provided
    update_data = script_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if hasattr(script, field):
            setattr(script, field, value)
    
    # Update the date_updated timestamp
    setattr(script, 'date_updated', datetime.now(timezone.utc))
    
    try:
        db.commit()
        db.refresh(script)
        
        # Update SHOW START duration if start or end times were changed
        if 'start_time' in update_data or 'end_time' in update_data:
            from .script_elements import _auto_populate_show_start_duration
            elements = db.query(models.ScriptElement).filter(
                models.ScriptElement.script_id == script_id
            ).all()
            _auto_populate_show_start_duration(db, script, elements)
        
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
    ).filter(models.Script.script_id == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.owner_id != user.user_id:
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