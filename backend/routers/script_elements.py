# backend/routers/script_elements.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from uuid import UUID
from datetime import datetime, timezone, timedelta
from typing import List, Optional
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

router = APIRouter(prefix="/api", tags=["script-elements"])

async def _auto_populate_show_start_duration(db: Session, script: models.Script, elements: List[models.ScriptElement]):
    """Auto-populate SHOW START duration if missing and show times are available."""
    
    if not script.startTime or not script.endTime:
        return
    
    # Find SHOW START element that has no duration set
    show_start_element = None
    for element in elements:
        if (element.description and 
            element.description.upper() == 'SHOW START' and 
            not element.duration):
            show_start_element = element
            break
    
    if not show_start_element:
        return
    
    # Calculate duration between script start and end times
    duration_delta = script.endTime - script.startTime
    duration_seconds = int(duration_delta.total_seconds())
    
    if duration_seconds > 0:
        show_start_element.duration = duration_seconds
        db.commit()

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


# =============================================================================
# SCRIPT ELEMENT ENDPOINTS
# =============================================================================

@router.get("/scripts/{script_id}/elements", response_model=List[schemas.ScriptElement])
async def get_script_elements(
    script_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    element_type: Optional[str] = Query(None, description="Filter by element type (cue, note, group)"),
    department_id: Optional[UUID] = Query(None, description="Filter by department ID"),
    active_only: bool = Query(True, description="Only return active elements"),
    skip: int = Query(0, ge=0, description="Number of elements to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of elements to return")
):
    """Get all elements for a script with optional filtering."""
    
    # First verify the script exists and user has access
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Security check: ensure user owns the show
    if script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to view this script")
    
    # Build query with filters and include department relationship
    query = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.department)
    ).filter(models.ScriptElement.scriptID == script_id)
    
    if active_only:
        query = query.filter(models.ScriptElement.isActive == True)
    
    if element_type:
        try:
            element_type_enum = models.ElementType(element_type.lower())
            query = query.filter(models.ScriptElement.elementType == element_type_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid element type: {element_type}")
    
    if department_id:
        query = query.filter(models.ScriptElement.departmentID == department_id)
    
    # Order by sequence, then by time offset
    query = query.order_by(
        models.ScriptElement.sequence.asc(),
        models.ScriptElement.timeOffsetMs.asc()
    )
    
    # Apply pagination
    elements = query.offset(skip).limit(limit).all()
    
    # Auto-populate SHOW START cue duration if missing
    await _auto_populate_show_start_duration(db, script, elements)
    
    return elements


@router.get("/elements/{element_id}", response_model=schemas.ScriptElement)
async def get_script_element(
    element_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single script element by ID."""
    
    element = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.script).joinedload(models.Script.show),
        joinedload(models.ScriptElement.department),
        joinedload(models.ScriptElement.equipment),
        joinedload(models.ScriptElement.crew_assignments),
        joinedload(models.ScriptElement.performer_assignments),
        joinedload(models.ScriptElement.conditional_rules)
    ).filter(models.ScriptElement.elementID == element_id).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Script element not found")
    
    # Security check: ensure user owns the show
    if element.script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to view this element")
    
    return element


@router.post("/scripts/{script_id}/elements", response_model=schemas.ScriptElement)
async def create_script_element(
    script_id: UUID,
    element: schemas.ScriptElementCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new script element."""
    
    # Verify the script exists and user has access
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Security check: ensure user owns the show
    if script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to modify this script")
    
    # If department is specified, verify it exists and user owns it
    if element.departmentID:
        department = db.query(models.Department).filter(
            models.Department.departmentID == element.departmentID,
            models.Department.ownerID == user.userID
        ).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found or not accessible")
    
    # Calculate next sequence number if not provided
    if element.sequence is None:
        max_sequence = db.query(models.ScriptElement.sequence).filter(
            models.ScriptElement.scriptID == script_id
        ).order_by(models.ScriptElement.sequence.desc()).first()
        element.sequence = (max_sequence[0] + 1) if max_sequence and max_sequence[0] else 1
    
    # Create the element
    try:
        new_element = models.ScriptElement(
            scriptID=script_id,
            elementType=models.ElementType(element.elementType),
            sequence=element.sequence,
            timeOffsetMs=element.timeOffsetMs or 0,
            triggerType=models.TriggerType(element.triggerType) if element.triggerType else models.TriggerType.MANUAL,
            cueID=element.cueID,
            description=element.description or "",
            cueNotes=element.cueNotes,
            departmentID=element.departmentID,
            location=models.LocationArea(element.location) if element.location else None,
            locationDetails=element.locationDetails,
            duration=element.duration,
            fadeIn=element.fadeIn,
            fadeOut=element.fadeOut,
            priority=models.PriorityLevel(element.priority) if element.priority else models.PriorityLevel.NORMAL,
            executionStatus=models.ExecutionStatus.PENDING,
            parentElementID=element.parentElementID,
            groupLevel=element.groupLevel or 0,
            isSafetyCritical=element.isSafetyCritical or False,
            safetyNotes=element.safetyNotes,
            departmentColor=element.departmentColor,
            customColor=element.customColor,
            createdBy=user.userID,
            updatedBy=user.userID,
            # Set legacy fields for compatibility
            elementOrder=element.sequence or 1,
            elementDescription=element.description or ""
        )
        
        db.add(new_element)
        db.commit()
        db.refresh(new_element)
        
        logger.info(f"Created script element {new_element.elementID} for script {script_id}")
        return new_element
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create script element: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create element: {str(e)}")


@router.patch("/elements/{element_id}", response_model=schemas.ScriptElement)
async def update_script_element(
    element_id: UUID,
    element_update: schemas.ScriptElementUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a script element."""
    
    # Get the element with script and show
    element = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.script).joinedload(models.Script.show)
    ).filter(models.ScriptElement.elementID == element_id).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Script element not found")
    
    # Security check: ensure user owns the show
    if element.script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to modify this element")
    
    # Get update data, excluding unset fields
    update_data = element_update.model_dump(exclude_unset=True)
    
    try:
        # Handle enum conversions and special fields
        for field, value in update_data.items():
            if field == "elementType" and value is not None:
                setattr(element, field, models.ElementType(value))
            elif field == "triggerType" and value is not None:
                setattr(element, field, models.TriggerType(value))
            elif field == "priority" and value is not None:
                setattr(element, field, models.PriorityLevel(value))
            elif field == "executionStatus" and value is not None:
                setattr(element, field, models.ExecutionStatus(value))
            elif field == "location" and value is not None:
                setattr(element, field, models.LocationArea(value))
            elif field == "timeOffsetMs" and value is not None:
                setattr(element, field, value)
            elif field == "description" and value is not None:
                # Update both new and legacy description fields
                setattr(element, field, value)
                setattr(element, "elementDescription", value)
            elif field == "sequence" and value is not None:
                # Update both sequence and legacy elementOrder
                setattr(element, field, value)
                setattr(element, "elementOrder", value)
            elif hasattr(element, field):
                setattr(element, field, value)
        
        # Always update the updatedBy and version
        setattr(element, "updatedBy", user.userID)
        setattr(element, "version", element.version + 1)
        setattr(element, "dateUpdated", datetime.now(timezone.utc))
        
        db.commit()
        db.refresh(element)
        
        logger.info(f"Updated script element {element_id}")
        return element
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update script element {element_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update element: {str(e)}")


@router.delete("/elements/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script_element(
    element_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    soft_delete: bool = Query(True, description="Soft delete (set isActive=False) or hard delete")
):
    """Delete a script element (soft delete by default)."""
    
    # Get the element with script and show
    element = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.script).joinedload(models.Script.show)
    ).filter(models.ScriptElement.elementID == element_id).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Script element not found")
    
    # Security check: ensure user owns the show
    if element.script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to delete this element")
    
    try:
        if soft_delete:
            # Soft delete: just mark as inactive
            element.isActive = False
            element.updatedBy = user.userID
            element.version = element.version + 1
            element.dateUpdated = datetime.now(timezone.utc)
            logger.info(f"Soft deleted script element {element_id}")
        else:
            # Hard delete: remove from database
            db.delete(element)
            logger.info(f"Hard deleted script element {element_id}")
        
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete script element {element_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete element: {str(e)}")


@router.post("/elements/{element_id}/restore", response_model=schemas.ScriptElement)
async def restore_script_element(
    element_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted script element."""
    
    # Get the element with script and show (including inactive ones)
    element = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.script).joinedload(models.Script.show)
    ).filter(models.ScriptElement.elementID == element_id).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Script element not found")
    
    # Security check: ensure user owns the show
    if element.script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to restore this element")
    
    if element.isActive:
        raise HTTPException(status_code=400, detail="Element is already active")
    
    try:
        element.isActive = True
        element.updatedBy = user.userID
        element.version = element.version + 1
        element.dateUpdated = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(element)
        
        logger.info(f"Restored script element {element_id}")
        return element
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to restore script element {element_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restore element: {str(e)}")


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.patch("/scripts/{script_id}/elements/reorder")
async def reorder_script_elements(
    script_id: UUID,
    reorder_data: schemas.ScriptElementReorderRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder script elements by updating their sequence numbers."""
    
    # Verify the script exists and user has access
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Security check: ensure user owns the show
    if script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to modify this script")
    
    try:
        # Update sequence numbers for each element
        for item in reorder_data.elements:
            element = db.query(models.ScriptElement).filter(
                and_(
                    models.ScriptElement.elementID == item.elementID,
                    models.ScriptElement.scriptID == script_id
                )
            ).first()
            
            if element:
                element.sequence = item.sequence
                element.elementOrder = item.sequence  # Update legacy field too
                element.updatedBy = user.userID
                element.version = element.version + 1
                element.dateUpdated = datetime.now(timezone.utc)
        
        db.commit()
        logger.info(f"Reordered {len(reorder_data.elements)} elements in script {script_id}")
        
        return {"message": f"Successfully reordered {len(reorder_data.elements)} elements"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to reorder elements in script {script_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reorder elements: {str(e)}")


@router.patch("/scripts/{script_id}/elements/bulk-update")
async def bulk_update_script_elements(
    script_id: UUID,
    bulk_update: schemas.ScriptElementBulkUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bulk update multiple script elements."""
    
    # Verify the script exists and user has access
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Security check: ensure user owns the show
    if script.show.ownerID != user.userID:
        raise HTTPException(status_code=403, detail="Not authorized to modify this script")
    
    try:
        updated_count = 0
        
        # Get all elements to update
        elements = db.query(models.ScriptElement).filter(
            and_(
                models.ScriptElement.scriptID == script_id,
                models.ScriptElement.elementID.in_(bulk_update.element_ids)
            )
        ).all()
        
        # Apply updates to each element
        for element in elements:
            if bulk_update.department_id is not None:
                element.departmentID = bulk_update.department_id
            if bulk_update.priority is not None:
                element.priority = models.PriorityLevel(bulk_update.priority)
            if bulk_update.execution_status is not None:
                element.executionStatus = models.ExecutionStatus(bulk_update.execution_status)
            if bulk_update.location is not None:
                element.location = models.LocationArea(bulk_update.location) if bulk_update.location else None
            if bulk_update.is_safety_critical is not None:
                element.isSafetyCritical = bulk_update.is_safety_critical
            if bulk_update.custom_color is not None:
                element.customColor = bulk_update.custom_color
            
            element.updatedBy = user.userID
            element.version = element.version + 1
            element.dateUpdated = datetime.now(timezone.utc)
            updated_count += 1
        
        db.commit()
        logger.info(f"Bulk updated {updated_count} elements in script {script_id}")
        
        return {"message": f"Successfully updated {updated_count} elements"}
        
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to bulk update elements in script {script_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk update elements: {str(e)}")