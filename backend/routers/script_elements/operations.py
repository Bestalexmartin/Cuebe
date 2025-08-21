# backend/routers/script_elements/operations.py

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime, timezone
import logging

import models
import schemas
from .helpers import _auto_populate_show_start_duration

logger = logging.getLogger(__name__)

def batch_update_from_edit_queue(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest,
    user: models.User,
    db: Session
):
    """Process a batch of edit queue operations."""
    
    logger.info(f"Processing batch update for script {script_id} with {len(batch_request.operations)} operations")
    
    operation_results = []
    processed_operations = 0
    # Track temporary group IDs to real UUIDs within this batch
    temp_id_mapping = {}
    
    try:
        for operation_data in batch_request.operations:
            try:
                # Apply temporary ID mapping before processing  
                if operation_data.get("element_id") and operation_data.get("element_id") in temp_id_mapping:
                    operation_data["element_id"] = temp_id_mapping[operation_data.get("element_id")]
                
                result = _process_edit_operation(db, script_id, operation_data, user, temp_id_mapping)
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


def _process_edit_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User, temp_id_mapping: dict = None):
    """Process a single edit queue operation."""
    
    operation_type = operation_data.get("type")
    element_id = operation_data.get("element_id")
    
    if operation_type == "REORDER":
        return _process_reorder_operation(db, script_id, operation_data, user)
    elif operation_type == "UPDATE_FIELD":
        return _process_update_field_operation(db, element_id, operation_data, user)    
    elif operation_type == "UPDATE_ELEMENT":
        return _process_update_element_operation(db, element_id, operation_data, user)    
    elif operation_type == "UPDATE_GROUP_WITH_PROPAGATION":
        return _process_update_group_with_propagation_operation(db, script_id, element_id, operation_data, user)
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
    elif operation_type == "CREATE_GROUP":
        return _process_create_group_operation(db, script_id, operation_data, user, temp_id_mapping)
    elif operation_type == "UPDATE_SCRIPT_INFO":
        return _process_update_script_info_operation(db, script_id, operation_data, user)
    elif operation_type == "TOGGLE_GROUP_COLLAPSE":
        # Handle temporary ID mapping for group collapse operations too
        if temp_id_mapping and element_id and element_id in temp_id_mapping:
            element_id = temp_id_mapping[element_id]
        return _process_toggle_group_collapse_operation(db, element_id, operation_data, user)
    elif operation_type == "BATCH_COLLAPSE_GROUPS":
        return _process_batch_collapse_groups_operation(db, operation_data, user)
    elif operation_type == "UNGROUP_ELEMENTS":
        return _process_ungroup_elements_operation(db, script_id, operation_data, user)
    else:
        raise ValueError(f"Unknown operation type: {operation_type}")


def _process_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a single element reorder operation by updating all affected sequences."""
    
    element_id = operation_data.get("element_id")
    old_sequence = operation_data.get("old_sequence")
    new_sequence = operation_data.get("new_sequence")
    
    if old_sequence == new_sequence:
        # No change needed
        return {"element_id": element_id, "new_sequence": new_sequence, "no_change": True}
    
    # Get all elements in the script ordered by sequence
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).order_by(models.ScriptElement.sequence.asc()).all()
    
    # Find the element being moved
    moved_element = None
    for element in all_elements:
        if str(element.element_id) == element_id:
            moved_element = element
            break
    
    if not moved_element:
        raise ValueError(f"Element {element_id} not found")
    
    # Check if we're moving a group parent - if so, we need to move the entire group
    is_group_parent = str(moved_element.element_type) == 'ElementType.GROUP' or moved_element.element_type == models.ElementType.GROUP
    group_children = []
    if is_group_parent:
        # Find all children of this group
        group_children = [el for el in all_elements if el.parent_element_id == str(moved_element.element_id)]
    
    # Update sequences for all elements to ensure no duplicates
    # Create a new sequence mapping based on the move
    updated_count = 0
    
    if is_group_parent and group_children:
        # Special handling for group parent moves - move the entire group as a unit
        group_size = len(group_children) + 1  # parent + children
        if old_sequence < new_sequence:
            # Moving down: elements between old and new positions move up by group_size
            for element in all_elements:
                if element.element_id == moved_element.element_id:
                    # Move the group parent
                    element.sequence = new_sequence
                    updated_count += 1
                elif element.parent_element_id == str(moved_element.element_id):
                    # Move group children to be consecutive after parent
                    child_index = group_children.index(element)
                    element.sequence = new_sequence + child_index + 1
                    updated_count += 1
                elif element.sequence > old_sequence and element.sequence <= new_sequence:
                    # Other elements move up by the size of the group
                    element.sequence = element.sequence - group_size
                    updated_count += 1
                
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
                
        else:
            # Moving up: elements between new and old positions move down by group_size
            for element in all_elements:
                if element.element_id == moved_element.element_id:
                    # Move the group parent
                    element.sequence = new_sequence
                    updated_count += 1
                elif element.parent_element_id == str(moved_element.element_id):
                    # Move group children to be consecutive after parent
                    child_index = group_children.index(element)
                    element.sequence = new_sequence + child_index + 1
                    updated_count += 1
                elif element.sequence >= new_sequence and element.sequence < old_sequence:
                    # Other elements move down by the size of the group
                    element.sequence = element.sequence + group_size
                    updated_count += 1
                
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
    else:
        # Regular element reorder (not a group parent)
        if old_sequence < new_sequence:
            # Moving down: elements between old and new positions move up by 1
            for element in all_elements:
                if element.element_id == moved_element.element_id:
                    element.sequence = new_sequence
                    updated_count += 1
                elif element.sequence > old_sequence and element.sequence <= new_sequence:
                    element.sequence = element.sequence - 1
                    updated_count += 1
                # Other elements keep their sequence
                
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
                
        else:
            # Moving up: elements between new and old positions move down by 1
            for element in all_elements:
                if element.element_id == moved_element.element_id:
                    element.sequence = new_sequence
                    updated_count += 1
                elif element.sequence >= new_sequence and element.sequence < old_sequence:
                    element.sequence = element.sequence + 1
                    updated_count += 1
                # Other elements keep their sequence
                
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
    
    return {
        "element_id": element_id, 
        "old_sequence": old_sequence,
        "new_sequence": new_sequence, 
        "updated_count": updated_count
    }


def _process_update_field_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process a field update operation."""
    
    field = operation_data.get("field")
    new_value = operation_data.get("new_value")
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.element_id == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Update the specified field
    if hasattr(element, field):
        # Handle special cases for enum fields
        if field == "priority" and new_value:
            setattr(element, field, models.PriorityLevel(new_value))
        elif field == "element_type" and new_value:
            setattr(element, field, models.ElementType(new_value))
        else:
            setattr(element, field, new_value)
    else:
        raise ValueError(f"Invalid field: {field}")
    
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    return {"element_id": element_id, "field": field, "new_value": new_value}


def _process_update_element_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process an element update operation with multiple field changes."""
    
    changes = operation_data.get("changes", {})
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.element_id == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    updated_fields = {}
    
    # Apply each field change
    for field, change_data in changes.items():
        # Handle both camelCase (from frontend) and snake_case (internal)
        new_value = change_data.get("newValue") or change_data.get("new_value")
        
        if hasattr(element, field):
            # Handle special cases for enum fields
            if field == "priority" and new_value:
                setattr(element, field, models.PriorityLevel(new_value))
            elif field == "element_type" and new_value:
                setattr(element, field, models.ElementType(new_value))
            else:
                setattr(element, field, new_value)            
            updated_fields[field] = new_value
        else:
            raise ValueError(f"Invalid field: {field}")
    
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    return {"element_id": element_id, "updated_fields": updated_fields}


def _process_update_group_with_propagation_operation(db: Session, script_id: UUID, element_id: str, operation_data: dict, user: models.User):
    """Process a group update operation with offset propagation to children."""
    
    field_updates = operation_data.get("field_updates", {})
    offset_delta_ms = operation_data.get("offset_delta_ms", 0)
    
    # Get the group element
    group_element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id,
            models.ScriptElement.element_type == 'GROUP'
        )
    ).first()
    
    if not group_element:
        raise ValueError(f"Group element {element_id} not found")
    
    updated_fields = {}
    
    # Update group element fields
    for field, new_value in field_updates.items():
        if hasattr(group_element, field):
            setattr(group_element, field, new_value)
            updated_fields[field] = new_value
    
    # Propagate offset changes to children if there's a delta
    children_updated = 0
    if offset_delta_ms != 0:
        child_elements = db.query(models.ScriptElement).filter(
            and_(
                models.ScriptElement.script_id == script_id,
                models.ScriptElement.parent_element_id == UUID(element_id),
                models.ScriptElement.group_level > 0
            )
        ).all()
        
        for child in child_elements:
            new_offset = (child.offset_ms or 0) + offset_delta_ms
            # Ensure offset doesn't go negative
            child.offset_ms = max(0, new_offset)
            child.updated_by = user.user_id
            child.date_updated = datetime.now(timezone.utc)
            children_updated += 1
    
    # Update group metadata
    group_element.updated_by = user.user_id
    group_element.date_updated = datetime.now(timezone.utc)
    
    
    return {
        "element_id": element_id,
        "updated_fields": updated_fields,
        "children_updated": children_updated,
        "offset_delta_ms": offset_delta_ms
    }


def _process_update_time_offset_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process a time offset update operation."""
    
    # Handle both camelCase (from frontend) and snake_case (internal)
    new_time_offset = operation_data.get("newOffsetMs") or operation_data.get("new_offset_ms")
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.element_id == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    element.offset_ms = new_time_offset
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    return {"element_id": element_id, "new_time_offset": new_time_offset}


def _process_toggle_group_collapse_operation(db: Session, element_id: str, operation_data: dict, user: models.User):
    """Process a toggle group collapse operation."""
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.element_id == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Use the target state from the frontend instead of just toggling
    target_collapsed_state = operation_data.get("target_collapsed_state")
    if target_collapsed_state is not None:
        element.is_collapsed = target_collapsed_state
    else:
        # Fallback to toggle behavior if target state not provided
        element.is_collapsed = not (element.is_collapsed or False)
    
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {"element_id": element_id, "is_collapsed": element.is_collapsed}


def _process_batch_collapse_groups_operation(db: Session, operation_data: dict, user: models.User):
    """Process a batch group collapse operation."""
    
    group_element_ids = operation_data.get("group_element_ids", [])
    target_collapsed_state = operation_data.get("target_collapsed_state", False)
    
    if not group_element_ids:
        return {"updated_count": 0, "message": "No groups to update"}
    
    updated_count = 0
    results = []
    
    for group_id in group_element_ids:
        try:
            element = db.query(models.ScriptElement).filter(
                models.ScriptElement.element_id == UUID(group_id)
            ).first()
            
            if element and element.element_type == models.ElementType.GROUP:
                element.is_collapsed = target_collapsed_state
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
                updated_count += 1
                results.append({
                    "element_id": group_id,
                    "is_collapsed": target_collapsed_state,
                    "success": True
                })
            else:
                results.append({
                    "element_id": group_id,
                    "success": False,
                    "error": "Group element not found"
                })
        except Exception as e:
            logger.error(f"Failed to update group {group_id}: {e}")
            results.append({
                "element_id": group_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "updated_count": updated_count,
        "total_count": len(group_element_ids),
        "target_collapsed_state": target_collapsed_state,
        "results": results
    }


def _process_create_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process an element creation operation."""
    
    element_data = operation_data.get("element_data", {})
    
    # Prepare enum fields with defaults
    priority = models.PriorityLevel.NORMAL  # Default
    if element_data.get("priority"):
        priority = models.PriorityLevel(element_data["priority"])
    
    # Create new script element
    new_element = models.ScriptElement(
        script_id=script_id,
        element_type=element_data.get("element_type", "CUE"),
        sequence=element_data.get("sequence", 1),
        offset_ms=element_data.get("offset_ms", 0),
        element_name=element_data.get("element_name", ""),
        cue_notes=element_data.get("cue_notes", ""),
        department_id=UUID(element_data["department_id"]) if element_data.get("department_id") else None,
        custom_color=element_data.get("custom_color"),
        # Handle group-related fields
        parent_element_id=element_data.get("parent_element_id"),
        group_level=element_data.get("group_level", 0),
        is_collapsed=element_data.get("is_collapsed", False),
        # Handle enum fields properly with explicit values
        priority=priority,
        created_by=user.user_id,
        updated_by=user.user_id,
        date_created=datetime.now(timezone.utc),
        date_updated=datetime.now(timezone.utc)
    )
    
    db.add(new_element)
    db.flush()  # Get the generated ID
    
    return {"element_id": str(new_element.element_id), "created": True}


def _process_delete_element_operation(db: Session, element_id: str, user: models.User):
    """Process an element deletion operation."""
    
    element = db.query(models.ScriptElement).filter(
        models.ScriptElement.element_id == UUID(element_id)
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Hard delete since we don't use soft delete anymore
    db.delete(element)
    return {"element_id": element_id, "deleted": True}

def _process_bulk_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a bulk reorder operation."""
    
    element_changes = operation_data.get("element_changes", [])
    updated_count = 0
    
    for change in element_changes:
        element_id = change.get("element_id")
        new_sequence = change.get("new_sequence")
        
        element = db.query(models.ScriptElement).filter(
            and_(
                models.ScriptElement.element_id == UUID(element_id),
                models.ScriptElement.script_id == script_id
            )
        ).first()
        
        if element:
            element.sequence = new_sequence
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            updated_count += 1
    
    return {"updated_count": updated_count, "total_changes": len(element_changes)}

def _process_disable_auto_sort_operation(operation_data: dict):
    """Process a disable auto-sort operation (preference only, no element changes)."""
    return {"preference_updated": True, "auto_sort_disabled": True}

def _process_create_group_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User, temp_id_mapping: dict = None):
    """Process a group creation operation."""
    
    element_ids = operation_data.get("element_ids", [])
    group_name = operation_data.get("group_name", "Untitled Group")
    background_color = operation_data.get("background_color", "#E2E8F0")

    if len(element_ids) < 2:
        raise ValueError("At least 2 elements are required to create a group")
    
    # Find all elements to be grouped
    elements_to_group = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id,
        models.ScriptElement.element_id.in_([UUID(eid) for eid in element_ids])
    ).all()
    
    if len(elements_to_group) != len(element_ids):
        raise ValueError("Some elements not found")
    
    # Find the minimum sequence and time offset for the group parent
    min_sequence = min(element.sequence for element in elements_to_group)
    min_time_offset = min(element.offset_ms for element in elements_to_group)
    
    # Don't generate group summary notes - will be calculated dynamically on frontend
    
    # Create the group parent element
    group_parent = models.ScriptElement(
        script_id=script_id,
        element_type='GROUP',
        sequence=min_sequence,
        offset_ms=min_time_offset,
        element_name=group_name,
        cue_notes="",  # Leave empty - will be calculated dynamically on frontend
        custom_color=background_color,

        priority=models.PriorityLevel.NORMAL,
        group_level=0,
        is_collapsed=False,
        parent_element_id=None,
        
        created_by=user.user_id,
        updated_by=user.user_id
    )
    
    db.add(group_parent)
    db.flush()  # Get the ID
    
    # Update all grouped elements to be children of the group
    for element in elements_to_group:
        element.parent_element_id = str(group_parent.element_id)
        element.group_level = 1
        element.updated_by = user.user_id
        element.date_updated = datetime.now(timezone.utc)
    
    # Update sequences to insert the group parent in the correct position
    # Get all elements for sequence updating
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).order_by(models.ScriptElement.sequence.asc()).all()
    
    # Rebuild sequences with group parent inserted
    sequence = 1
    group_parent_inserted = False
    
    for element in all_elements:
        if element.element_id == group_parent.element_id:
            continue  # Skip, we'll insert it manually
            
        # Insert group parent before the first grouped element
        if not group_parent_inserted and str(element.element_id) in element_ids:
            group_parent.sequence = sequence
            sequence += 1
            group_parent_inserted = True
        
        element.sequence = sequence
        sequence += 1
    
    # If group parent wasn't inserted yet (shouldn't happen), insert it at the end
    if not group_parent_inserted:
        group_parent.sequence = sequence
    
    # Add mapping from temporary frontend ID to real database UUID
    if temp_id_mapping is not None:
        # Look for the temporary group ID in the operation data
        temp_group_id = None
        if "element_data" in operation_data and "element_id" in operation_data["element_data"]:
            temp_group_id = operation_data["element_data"]["element_id"]
        
        if temp_group_id and temp_group_id.startswith("group-"):
            temp_id_mapping[temp_group_id] = str(group_parent.element_id)
    
    return {
        "operation": "create_group",
        "group_parent_id": str(group_parent.element_id),
        "grouped_element_ids": element_ids,
        "group_name": group_name
    }

def _process_ungroup_elements_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process an ungroup elements operation."""
    
    group_element_id = operation_data.get("group_element_id")
    
    # Find the group parent element
    group_element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(group_element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not group_element:
        raise ValueError(f"Group element {group_element_id} not found")
    
    # Find all child elements of this group
    child_elements = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.parent_element_id == group_element_id,
            models.ScriptElement.script_id == script_id
        )
    ).all()
    
    # Clear parent relationships for all children
    updated_children = 0
    for child in child_elements:
        child.parent_element_id = None
        child.group_level = 0
        child.updated_by = user.user_id
        child.date_updated = datetime.now(timezone.utc)
        updated_children += 1
    
    # Delete the group parent element
    db.delete(group_element)
    
    return {
        "operation": "ungroup_elements",
        "group_element_id": group_element_id,
        "updated_children": updated_children,
        "group_deleted": True
    }

def _process_update_script_info_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a script info update operation."""
    
    changes = operation_data.get("changes", {})
    
    # Get the script
    script = db.query(models.Script).filter(
        models.Script.script_id == script_id
    ).first()
    
    if not script:
        raise ValueError(f"Script {script_id} not found")
    
    updated_fields = []
    
    # Apply each field change
    for field, change_data in changes.items():
        # Handle both camelCase (from frontend) and snake_case (internal)
        new_value = change_data.get("newValue") or change_data.get("new_value")
        
        if field == "script_name":
            script.script_name = new_value
            updated_fields.append("script_name")
        elif field == "script_status":
            script.script_status = new_value
            updated_fields.append("script_status")
        elif field == "start_time":
            # Convert from string to datetime if needed
            if isinstance(new_value, str):
                script.start_time = datetime.fromisoformat(new_value.replace('Z', '+00:00'))
            else:
                script.start_time = new_value
            updated_fields.append("start_time")
        elif field == "end_time":
            # Convert from string to datetime if needed
            if isinstance(new_value, str):
                script.end_time = datetime.fromisoformat(new_value.replace('Z', '+00:00'))
            else:
                script.end_time = new_value
            updated_fields.append("end_time")
        elif field == "script_notes":
            script.script_notes = new_value
            updated_fields.append("script_notes")
    
    # Update metadata
    script.updated_by = user.user_id
    script.date_updated = datetime.now(timezone.utc)
    return {"script_id": str(script_id), "updated_fields": updated_fields}