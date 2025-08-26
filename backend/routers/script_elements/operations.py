# backend/routers/script_elements/operations.py

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
import schemas
from uuid import UUID
from datetime import datetime, timezone
import logging

import models
import schemas
from .helpers import _auto_populate_show_start_duration
from utils.datetime_utils import parse_iso_datetime

logger = logging.getLogger(__name__)


def _apply_operation_in_memory(elements_by_id: dict, script_id: UUID, operation_data: dict, user: models.User, temp_id_mapping: dict):
    """Apply a single operation to in-memory element state, mimicking frontend logic."""
    
    operation_type = operation_data.get("type")
    
    if operation_type == "REORDER":
        return _apply_reorder_in_memory(elements_by_id, operation_data)
    elif operation_type == "UNGROUP_ELEMENTS":
        return _apply_ungroup_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_ELEMENT":
        return _apply_update_element_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "CREATE_GROUP":
        return _apply_create_group_in_memory(elements_by_id, script_id, operation_data, user, temp_id_mapping)
    elif operation_type == "TOGGLE_GROUP_COLLAPSE":
        return _apply_toggle_group_collapse_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_FIELD":
        return _apply_update_field_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "CREATE_ELEMENT":
        return _apply_create_element_in_memory(elements_by_id, script_id, operation_data, user, temp_id_mapping)
    elif operation_type == "DELETE_ELEMENT":
        return _apply_delete_element_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_TIME_OFFSET":
        return _apply_update_time_offset_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "BULK_REORDER":
        return _apply_bulk_reorder_in_memory(elements_by_id, operation_data)
    elif operation_type == "ENABLE_AUTO_SORT":
        return _apply_enable_auto_sort_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "DISABLE_AUTO_SORT":
        return _apply_disable_auto_sort_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "BATCH_COLLAPSE_GROUPS":
        return _apply_batch_collapse_groups_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_GROUP_WITH_PROPAGATION":
        return _apply_update_group_with_propagation_in_memory(elements_by_id, operation_data, user)
    else:
        logger.warning(f"Unknown operation type: {operation_type}")
        raise ValueError(f"Unknown operation type: {operation_type}")


def _apply_reorder_in_memory(elements_by_id: dict, operation_data: dict):
    """Apply REORDER operation in-memory using the same logic as frontend."""
    
    element_id = operation_data.get("element_id")
    old_sequence = operation_data.get("old_sequence")
    new_sequence = operation_data.get("new_sequence")
    
    if old_sequence == new_sequence:
        return {"element_id": element_id, "new_sequence": new_sequence, "no_change": True}
    
    # Find the element being moved
    moved_element = elements_by_id.get(element_id)
    if not moved_element:
        raise ValueError(f"Element {element_id} not found")
    
    # Get current sequence from the element (may have changed from previous operations)
    current_sequence = moved_element.sequence
    
    # Check if this is a group parent
    is_group_parent = moved_element.element_type == models.ElementType.GROUP
    
    if is_group_parent:
        # Get group children
        group_children = [
            el for el in elements_by_id.values() 
            if el.parent_element_id == moved_element.element_id
        ]
        group_size = len(group_children) + 1  # parent + children
        
        # Apply group reordering logic (same as frontend)
        _apply_group_reorder_in_memory(elements_by_id, moved_element, group_children, current_sequence, new_sequence, group_size)
    else:
        # Apply single element reordering logic (same as frontend)
        _apply_single_element_reorder_in_memory(elements_by_id, moved_element, current_sequence, new_sequence)
    
    return {"element_id": element_id, "new_sequence": new_sequence}


def _apply_group_reorder_in_memory(elements_by_id: dict, moved_element, group_children: list, old_seq: int, new_seq: int, group_size: int):
    """Apply group reordering using the same two-phase logic as frontend."""
    
    # PHASE 1: Remove group and shift elements up to fill holes
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id or element.parent_element_id == moved_element.element_id:
            # Group elements: temporarily give them very high sequences
            element.sequence = 9999 + element.sequence
        elif element.sequence > old_seq + group_size - 1:
            # Elements after the ENTIRE old group footprint: shift up to fill holes
            element.sequence = element.sequence - group_size
    
    # PHASE 2: Place group at new position and shift elements down as needed
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id:
            # Group parent: place at new sequence
            element.sequence = new_seq
        elif element.parent_element_id == moved_element.element_id:
            # Group children: place consecutively after parent
            child_index = next(i for i, child in enumerate(group_children) if child.element_id == element.element_id)
            element.sequence = new_seq + child_index + 1
        elif element.sequence >= new_seq and element.sequence < 9999:
            # Non-group elements at or after new position: shift down by group size
            element.sequence = element.sequence + group_size


def _apply_single_element_reorder_in_memory(elements_by_id: dict, moved_element, old_seq: int, new_seq: int):
    """Apply single element reordering using the same logic as frontend."""
    
    # Update the moved element
    moved_element.sequence = new_seq
    
    # Shift other elements
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id:
            continue  # Skip the moved element itself
            
        if old_seq < new_seq:
            # Moving down: shift elements between old and new positions up
            if old_seq < element.sequence <= new_seq:
                element.sequence = element.sequence - 1
        elif old_seq > new_seq:
            # Moving up: shift elements between new and old positions down
            if new_seq <= element.sequence < old_seq:
                element.sequence = element.sequence + 1


def _apply_ungroup_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UNGROUP_ELEMENTS operation in-memory using the same logic as frontend."""
    
    group_element_id = operation_data.get("group_element_id")
    
    # Find the group parent element
    group_element = elements_by_id.get(group_element_id)
    if not group_element:
        raise ValueError(f"Group element {group_element_id} not found")
    
    # Find all child elements of this group
    child_elements = [
        el for el in elements_by_id.values() 
        if el.parent_element_id and str(el.parent_element_id) == group_element_id
    ]
    
    updated_children = 0
    
    # Clear parent relationships for all children
    for child in child_elements:
        child.parent_element_id = None
        child.group_level = 0
        child.updated_by = user.user_id
        child.date_updated = datetime.now(timezone.utc)
        updated_children += 1
    
    # Remove the group parent element from the in-memory dict
    # (This simulates the db.delete() operation)
    del elements_by_id[group_element_id]
    
    return {
        "operation": "ungroup_elements",
        "group_element_id": group_element_id,
        "updated_children": updated_children,
        "group_deleted": True
    }


def _apply_update_element_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_ELEMENT operation in-memory."""
    
    element_id = operation_data.get("element_id")
    changes = operation_data.get("changes", {})
    
    # Find the element
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Apply all field changes
    updated_fields = []
    for field, change in changes.items():
        old_value = getattr(element, field, None)
        new_value = change.get("new_value")
        setattr(element, field, new_value)
        updated_fields.append(field)
    
    # Update metadata
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "update_element",
        "element_id": element_id,
        "updated_fields": updated_fields
    }


def _apply_create_group_in_memory(elements_by_id: dict, script_id: UUID, operation_data: dict, user, temp_id_mapping: dict = None):
    """Apply CREATE_GROUP operation in-memory."""
    
    group_name = operation_data.get("group_name", "Untitled Group")
    element_ids = operation_data.get("element_ids", [])
    background_color = operation_data.get("background_color", "#E2E8F0")
    
    # Find elements to be grouped
    elements_to_group = [elements_by_id.get(el_id) for el_id in element_ids if elements_by_id.get(el_id)]
    if not elements_to_group:
        raise ValueError("No valid elements found to group")
    
    # Calculate group properties
    min_sequence = min(el.sequence for el in elements_to_group)
    time_offsets = [el.offset_ms for el in elements_to_group]
    min_time = min(time_offsets)
    max_time = max(time_offsets)
    group_duration = max_time - min_time
    
    # Create group parent element (simulate database object)
    import uuid
    group_id = str(uuid.uuid4())
    
    # Create a mock element object (this would normally be a SQLAlchemy model)
    class MockElement:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    group_element = MockElement(
        element_id=group_id,
        script_id=script_id,
        element_type=models.ElementType.GROUP,
        sequence=min_sequence,
        offset_ms=min_time,
        duration_ms=group_duration,
        element_name=group_name,
        custom_color=background_color,
        group_level=0,
        is_collapsed=False,
        parent_element_id=None,
        created_by=user.user_id,
        updated_by=user.user_id,
        date_created=datetime.now(timezone.utc),
        date_updated=datetime.now(timezone.utc)
    )
    
    # Add group to elements dict
    elements_by_id[group_id] = group_element
    
    # Store temp ID mapping if provided - frontend sends temp IDs like "group-op_1234567890_1"
    temp_id = operation_data.get("element_data", {}).get("element_id")
    if temp_id and temp_id_mapping is not None:
        temp_id_mapping[temp_id] = group_id
    
    # Update child elements
    for element in elements_to_group:
        element.parent_element_id = group_id
        element.group_level = 1
        element.updated_by = user.user_id
        element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "create_group",
        "group_element_id": group_id,
        "grouped_element_ids": element_ids,
        "group_name": group_name
    }


def _apply_toggle_group_collapse_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply TOGGLE_GROUP_COLLAPSE operation in-memory."""
    
    element_id = operation_data.get("element_id")
    target_collapsed_state = operation_data.get("target_collapsed_state")
    
    # Find the group element
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Update collapse state
    element.is_collapsed = target_collapsed_state
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "toggle_group_collapse",
        "element_id": element_id,
        "target_collapsed_state": target_collapsed_state
    }


def _apply_update_field_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_FIELD operation in-memory."""
    
    element_id = operation_data.get("element_id")
    field = operation_data.get("field")
    new_value = operation_data.get("new_value")
    
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Set the field value
    setattr(element, field, new_value)
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "update_field",
        "element_id": element_id,
        "field": field,
        "new_value": new_value
    }


def _apply_create_element_in_memory(elements_by_id: dict, script_id: UUID, operation_data: dict, user, temp_id_mapping: dict):
    """Apply CREATE_ELEMENT operation in-memory."""
    
    element_data = operation_data.get("element_data", {})
    insert_index = operation_data.get("insert_index")
    
    import uuid
    new_element_id = str(uuid.uuid4())
    
    # Create a mock element object
    class MockElement:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    # Calculate sequence based on insert_index or append to end
    if insert_index is not None:
        # Find elements with sequence >= insert_index and increment them
        for element in elements_by_id.values():
            if element.sequence >= insert_index:
                element.sequence += 1
        new_sequence = insert_index
    else:
        # Append to end
        max_sequence = max(el.sequence for el in elements_by_id.values()) if elements_by_id else 0
        new_sequence = max_sequence + 1
    
    new_element = MockElement(
        element_id=new_element_id,
        script_id=script_id,
        sequence=new_sequence,
        created_by=user.user_id,
        updated_by=user.user_id,
        date_created=datetime.now(timezone.utc),
        date_updated=datetime.now(timezone.utc),
        **element_data
    )
    
    elements_by_id[new_element_id] = new_element
    
    # Store temp ID mapping if provided
    temp_id = operation_data.get("element_id")
    if temp_id:
        temp_id_mapping[temp_id] = new_element_id
    
    return {
        "operation": "create_element",
        "element_id": new_element_id,
        "sequence": new_sequence
    }


def _apply_delete_element_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply DELETE_ELEMENT operation in-memory."""
    
    element_id = operation_data.get("element_id")
    
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    deleted_sequence = element.sequence
    
    # Remove element
    del elements_by_id[element_id]
    
    # Adjust sequences of remaining elements
    for remaining_element in elements_by_id.values():
        if remaining_element.sequence > deleted_sequence:
            remaining_element.sequence -= 1
            remaining_element.updated_by = user.user_id
            remaining_element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "delete_element",
        "element_id": element_id,
        "deleted_sequence": deleted_sequence
    }


def _apply_update_time_offset_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_TIME_OFFSET operation in-memory."""
    
    element_id = operation_data.get("element_id")
    new_offset_ms = operation_data.get("new_offset_ms")
    
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    element.offset_ms = new_offset_ms
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "update_time_offset",
        "element_id": element_id,
        "new_offset_ms": new_offset_ms
    }


def _apply_bulk_reorder_in_memory(elements_by_id: dict, operation_data: dict):
    """Apply BULK_REORDER operation in-memory."""
    
    element_changes = operation_data.get("element_changes", [])
    
    for change in element_changes:
        element_id = change.get("element_id")
        new_sequence = change.get("new_sequence")
        
        element = elements_by_id.get(element_id)
        if element:
            element.sequence = new_sequence
    
    return {
        "operation": "bulk_reorder",
        "updated_count": len(element_changes)
    }


def _apply_enable_auto_sort_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply ENABLE_AUTO_SORT operation in-memory - full resequencing by time."""
    
    resequenced_elements = operation_data.get("resequenced_elements", [])
    total_elements = operation_data.get("total_elements", 0)
    
    
    # Apply the resequencing
    updated_count = 0
    for resequence in resequenced_elements:
        element_id = resequence.get("element_id")
        old_sequence = resequence.get("old_sequence")
        new_sequence = resequence.get("new_sequence")
        
        element = elements_by_id.get(element_id)
        if element:
            element.sequence = new_sequence
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            updated_count += 1
    
    return {
        "operation": "enable_auto_sort",
        "resequenced_count": updated_count,
        "total_elements": total_elements
    }


def _apply_disable_auto_sort_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply DISABLE_AUTO_SORT operation in-memory."""
    
    # This operation typically just changes a preference, no element changes needed
    return {
        "operation": "disable_auto_sort",
        "status": "completed"
    }


def _apply_script_operation_directly(script_id: UUID, operation_data: dict, user, db: Session):
    """Apply script-level operations directly to database."""
    
    operation_type = operation_data.get("type")
    
    if operation_type == "UPDATE_SCRIPT_INFO":
        changes = operation_data.get("changes", {})
        
        # Load the script
        script = db.query(models.Script).filter(models.Script.script_id == script_id).first()
        if not script:
            raise ValueError(f"Script {script_id} not found")
        
        # Apply changes
        for field, change_data in changes.items():
            new_value = change_data.get("new_value")
            setattr(script, field, new_value)
        
        script.updated_by = user.user_id
        script.date_updated = datetime.now(timezone.utc)
        
        # Commit immediately since this is a separate table operation
        db.commit()
        
        return {
            "operation": "update_script_info",
            "script_id": str(script_id),
            "changes_count": len(changes)
        }
    
    else:
        raise ValueError(f"Unknown script operation type: {operation_type}")


def _apply_batch_collapse_groups_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply BATCH_COLLAPSE_GROUPS operation in-memory."""
    
    group_element_ids = operation_data.get("group_element_ids", [])
    target_collapsed_state = operation_data.get("target_collapsed_state")
    
    updated_count = 0
    for group_id in group_element_ids:
        element = elements_by_id.get(group_id)
        if element:
            element.is_collapsed = target_collapsed_state
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            updated_count += 1
    
    return {
        "operation": "batch_collapse_groups",
        "updated_count": updated_count,
        "target_collapsed_state": target_collapsed_state
    }


def _apply_update_group_with_propagation_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_GROUP_WITH_PROPAGATION operation in-memory."""
    
    element_id = operation_data.get("element_id")
    field_updates = operation_data.get("field_updates", {})
    offset_delta_ms = operation_data.get("offset_delta_ms", 0)
    affected_children = operation_data.get("affected_children", [])
    
    # Update the group element
    element = elements_by_id.get(element_id)
    if element:
        for field, value in field_updates.items():
            setattr(element, field, value)
        element.updated_by = user.user_id
        element.date_updated = datetime.now(timezone.utc)
    
    # Propagate offset changes to children
    if offset_delta_ms != 0:
        for child_id in affected_children:
            child = elements_by_id.get(child_id)
            if child:
                child.offset_ms += offset_delta_ms
                child.updated_by = user.user_id
                child.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "update_group_with_propagation",
        "element_id": element_id,
        "affected_children_count": len(affected_children)
    }


def batch_update_from_edit_queue(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest,
    user: models.User,
    db: Session
):
    """Process a batch of edit queue operations in-memory, then commit all changes atomically."""
    
    logger.info(f"Processing batch update for script {script_id} with {len(batch_request.operations)} operations")
    
    # Separate script operations from element operations
    script_operations = []
    element_operations = []
    
    for operation in batch_request.operations:
        if operation.get("type") == "UPDATE_SCRIPT_INFO":
            script_operations.append(operation)
        else:
            element_operations.append(operation)
    
    # Load all elements once at the start
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).order_by(models.ScriptElement.sequence.asc()).all()
    
    # Convert to dict for efficient lookup and modification tracking
    elements_by_id = {}
    original_sequences = {}
    
    for element in all_elements:
        element_id_str = str(element.element_id)
        elements_by_id[element_id_str] = element
        original_sequences[element_id_str] = element.sequence
    
    operation_results = []
    processed_operations = 0
    temp_id_mapping = {}
    
    try:
        # Process script operations first (directly to database)
        for operation_data in script_operations:
            try:
                result = _apply_script_operation_directly(script_id, operation_data, user, db)
                operation_results.append({
                    "operation_id": operation_data.get("id"),
                    "status": "success", 
                    "result": result
                })
                processed_operations += 1
                
            except Exception as op_error:
                logger.error(f"Failed to process script operation {operation_data.get('id')}: {str(op_error)}", exc_info=True)
                operation_results.append({
                    "operation_id": operation_data.get("id"),
                    "status": "error",
                    "error": str(op_error)
                })
        
        # Process element operations in-memory, sequentially
        for operation_data in element_operations:
            try:
                # Apply temporary ID mapping before processing  
                if operation_data.get("element_id") and operation_data.get("element_id") in temp_id_mapping:
                    old_id = operation_data.get("element_id")
                    new_id = temp_id_mapping[old_id]
                    operation_data["element_id"] = new_id
                
                # Process operation on in-memory state
                result = _apply_operation_in_memory(
                    elements_by_id, script_id, operation_data, user, temp_id_mapping
                )
                
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
        
        # Now update only the elements that changed sequences
        changed_elements = []
        for element_id_str, element in elements_by_id.items():
            if original_sequences.get(element_id_str) != element.sequence:
                changed_elements.append(element)
        
        
        # Commit all changes atomically
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
