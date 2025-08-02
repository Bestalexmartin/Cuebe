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

def _auto_populate_show_start_duration(db: Session, script: models.Script, elements: List[models.ScriptElement]):
    """Auto-populate SHOW START duration based on script start and end times."""
    
    if not script.startTime or not script.endTime:
        return
    
    # Calculate duration between script start and end times
    duration_delta = script.endTime - script.startTime
    duration_seconds = int(duration_delta.total_seconds())
    
    if duration_seconds <= 0:
        return
    
    # Find SHOW START element
    show_start_element = None
    for element in elements:
        if (element.description and 
            element.description.upper() == 'SHOW START'):
            show_start_element = element
            break
    
    if not show_start_element:
        return
    
    # Update duration if it's different from calculated duration
    if show_start_element.duration != duration_seconds:
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

@router.get("/scripts/{script_id}/elements", response_model=List[schemas.ScriptElementEnhanced])
def get_script_elements(
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
    _auto_populate_show_start_duration(db, script, elements)
    
    return elements


@router.get("/elements/{element_id}", response_model=schemas.ScriptElement)
def get_script_element(
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


# REMOVED: Single element creation endpoint - use batch-update for all operations


# REMOVED: Single element update endpoint - use batch-update for all operations


# REMOVED: Single element delete endpoint - use batch-update for all operations


# REMOVED: Single element restore endpoint - use batch-update for all operations


# REMOVED: Calculate show start duration endpoint - handled automatically in batch-update


# REMOVED: Auto-sort elements endpoint - handled via batch-update with ENABLE_AUTO_SORT operations


# =============================================================================
# BULK OPERATIONS
# =============================================================================

# REMOVED: Reorder elements endpoint - use batch-update with REORDER/BULK_REORDER operations


# REMOVED: Bulk update endpoint - use batch-update for all operations


@router.patch("/scripts/{script_id}/elements/batch-update")
def batch_update_from_edit_queue(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a batch of edit queue operations."""
    
    logger.info(f"Processing batch update for script {script_id} with {len(batch_request.operations)} operations")
    
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
        processed_operations = 0
        operation_results = []
        
        # Process each operation in sequence
        for operation_data in batch_request.operations:
            try:
                result = _process_edit_operation(db, script_id, operation_data, user)
                operation_results.append({
                    "operation_id": operation_data.get("id"),
                    "status": "success",
                    "result": result
                })
                processed_operations += 1
            except Exception as op_error:
                logger.error(f"Failed to process operation {operation_data.get('id')} of type {operation_data.get('type')}: {str(op_error)}", exc_info=True)
                operation_results.append({
                    "operation_id": operation_data.get("id"),
                    "status": "error",
                    "error": str(op_error)
                })
                # Continue with other operations rather than failing the entire batch
        
        # Commit all successful operations
        db.commit()
        
        # Refresh script object and update SHOW START duration if needed
        db.refresh(script)
        elements = db.query(models.ScriptElement).filter(
            models.ScriptElement.scriptID == script_id
        ).all()
        _auto_populate_show_start_duration(db, script, elements)
        
        logger.info(f"Processed {processed_operations} operations for script {script_id}")
        
        return {
            "message": f"Processed {processed_operations}/{len(batch_request.operations)} operations",
            "processed_count": processed_operations,
            "total_count": len(batch_request.operations),
            "results": operation_results
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process batch operations for script {script_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process batch operations: {str(e)}")


def _process_edit_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a single edit queue operation."""
    
    operation_type = operation_data.get("type")
    element_id = operation_data.get("elementId")
    
    if operation_type == "REORDER":
        return _process_reorder_operation(db, script_id, operation_data, user)
    
    elif operation_type == "UPDATE_FIELD":
        return _process_update_field_operation(db, element_id, operation_data, user)
    
    elif operation_type == "UPDATE_TIME_OFFSET":
        return _process_update_time_offset_operation(db, element_id, operation_data, user)
    
    elif operation_type == "CREATE_ELEMENT":
        return _process_create_element_operation(db, script_id, operation_data, user)
    
    elif operation_type == "DELETE_ELEMENT":
        return _process_delete_element_operation(db, element_id, user)
    
    elif operation_type == "BULK_REORDER":
        return _process_bulk_reorder_operation(db, script_id, operation_data, user)
    
    elif operation_type == "ENABLE_AUTO_SORT":
        return _process_bulk_reorder_operation(db, script_id, operation_data, user)  # Uses same logic
    
    elif operation_type == "DISABLE_AUTO_SORT":
        return _process_disable_auto_sort_operation(operation_data)
    
    elif operation_type == "UPDATE_SCRIPT_INFO":
        return _process_update_script_info_operation(db, script_id, operation_data, user)
    
    else:
        raise ValueError(f"Unknown operation type: {operation_type}")


def _process_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a single element reorder operation."""
    
    element_id = operation_data.get("elementId")
    new_sequence = operation_data.get("newSequence")
    
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.elementID == UUID(element_id),
            models.ScriptElement.scriptID == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    element.sequence = new_sequence
    element.updatedBy = user.userID
    element.version = element.version + 1
    element.dateUpdated = datetime.now(timezone.utc)
    
    return {"element_id": element_id, "new_sequence": new_sequence}


def _process_update_field_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process a field update operation."""
    
    field = operation_data.get("field")
    new_value = operation_data.get("newValue")
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.elementID == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Update the specified field
    if hasattr(element, field):
        # Handle special cases for enum fields (convert to uppercase)
        if field == "priority" and new_value:
            setattr(element, field, models.PriorityLevel(new_value))
        elif field == "executionStatus" and new_value:
            setattr(element, field, models.ExecutionStatus(new_value))
        elif field == "triggerType" and new_value:
            setattr(element, field, models.TriggerType(new_value))
        elif field == "elementType" and new_value:
            setattr(element, field, models.ElementType(new_value))
        elif field == "location" and new_value:
            setattr(element, field, models.LocationArea(new_value))
        else:
            setattr(element, field, new_value)
    else:
        raise ValueError(f"Invalid field: {field}")
    
    element.updatedBy = user.userID
    element.version = element.version + 1
    element.dateUpdated = datetime.now(timezone.utc)
    
    return {"element_id": element_id, "field": field, "new_value": new_value}


def _process_update_time_offset_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process a time offset update operation."""
    
    new_time_offset = operation_data.get("newTimeOffsetMs")
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.elementID == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    element.timeOffsetMs = new_time_offset
    element.updatedBy = user.userID
    element.version = element.version + 1
    element.dateUpdated = datetime.now(timezone.utc)
    
    return {"element_id": element_id, "new_time_offset": new_time_offset}


def _process_create_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process an element creation operation."""
    
    element_data = operation_data.get("elementData", {})
    
    # Get the next elementOrder value
    max_order = db.query(models.ScriptElement.elementOrder).filter(
        models.ScriptElement.scriptID == script_id
    ).order_by(models.ScriptElement.elementOrder.desc()).first()
    
    next_order = (max_order[0] + 1) if max_order and max_order[0] is not None else 1
    
    # Prepare enum fields with defaults (frontend sends uppercase values)
    trigger_type = models.TriggerType.MANUAL  # Default
    if element_data.get("triggerType"):
        trigger_type = models.TriggerType(element_data["triggerType"])
    
    execution_status = models.ExecutionStatus.PENDING  # Default
    if element_data.get("executionStatus"):
        execution_status = models.ExecutionStatus(element_data["executionStatus"])
    
    priority = models.PriorityLevel.NORMAL  # Default
    if element_data.get("priority"):
        priority = models.PriorityLevel(element_data["priority"])
    
    # Create new script element
    new_element = models.ScriptElement(
        scriptID=script_id,
        elementType=element_data.get("elementType", "CUE"),
        elementOrder=next_order,
        sequence=element_data.get("sequence", 1),
        timeOffsetMs=element_data.get("timeOffsetMs", 0),
        description=element_data.get("description", ""),
        cueNotes=element_data.get("cueNotes", ""),
        departmentID=UUID(element_data["departmentID"]) if element_data.get("departmentID") else None,
        customColor=element_data.get("customColor"),
        # Handle enum fields properly with explicit values
        triggerType=trigger_type,
        executionStatus=execution_status,
        priority=priority,
        createdBy=user.userID,
        updatedBy=user.userID,
        dateCreated=datetime.now(timezone.utc),
        dateUpdated=datetime.now(timezone.utc)
    )
    
    db.add(new_element)
    db.flush()  # Get the generated ID
    
    return {"element_id": str(new_element.elementID), "created": True}


def _process_delete_element_operation(db: Session, element_id: str, user: models.User):
    """Process an element deletion operation."""
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.elementID == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Soft delete by setting isActive to False
    element.isActive = False
    element.updatedBy = user.userID
    element.version = element.version + 1
    element.dateUpdated = datetime.now(timezone.utc)
    
    return {"element_id": element_id, "deleted": True}


def _process_bulk_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a bulk reorder operation."""
    
    element_changes = operation_data.get("elementChanges", [])
    updated_count = 0
    
    for change in element_changes:
        element_id = change.get("elementId")
        new_sequence = change.get("newSequence")
        
        element = db.query(models.ScriptElement).filter(
            and_(
                models.ScriptElement.elementID == UUID(element_id),
                models.ScriptElement.scriptID == script_id
            )
        ).first()
        
        if element:
            element.sequence = new_sequence
            element.updatedBy = user.userID
            element.version = element.version + 1
            element.dateUpdated = datetime.now(timezone.utc)
            updated_count += 1
    
    return {"updated_count": updated_count, "total_changes": len(element_changes)}


def _process_disable_auto_sort_operation(operation_data: dict):
    """Process a disable auto-sort operation (preference only, no element changes)."""
    return {"preference_updated": True, "auto_sort_disabled": True}


def _process_update_script_info_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a script info update operation."""
    
    changes = operation_data.get("changes", {})
    
    # Get the script
    script = db.query(models.Script).filter(
        models.Script.scriptID == script_id
    ).first()
    
    if not script:
        raise ValueError(f"Script {script_id} not found")
    
    updated_fields = []
    
    # Apply each field change
    for field, change_data in changes.items():
        new_value = change_data.get("newValue")
        
        if field == "scriptName":
            script.scriptName = new_value
            updated_fields.append("scriptName")
        elif field == "scriptStatus":
            script.scriptStatus = new_value
            updated_fields.append("scriptStatus")
        elif field == "startTime":
            # Convert from string to datetime if needed
            if isinstance(new_value, str):
                script.startTime = datetime.fromisoformat(new_value.replace('Z', '+00:00'))
            else:
                script.startTime = new_value
            updated_fields.append("startTime")
        elif field == "endTime":
            # Convert from string to datetime if needed
            if isinstance(new_value, str):
                script.endTime = datetime.fromisoformat(new_value.replace('Z', '+00:00'))
            else:
                script.endTime = new_value
            updated_fields.append("endTime")
        elif field == "scriptNotes":
            script.scriptNotes = new_value
            updated_fields.append("scriptNotes")
    
    # Update metadata
    script.updatedBy = user.userID
    script.dateUpdated = datetime.now(timezone.utc)
    
    return {"script_id": str(script_id), "updated_fields": updated_fields}