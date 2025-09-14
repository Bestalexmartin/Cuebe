# backend/routers/script_elements/operations.py - STRIPPED FOR REBUILD

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
import schemas
from uuid import UUID
from datetime import datetime, timezone
import models
from .helpers import _auto_populate_show_start_duration
from utils.datetime_utils import parse_iso_datetime

import logging
logger = logging.getLogger(__name__)


def _apply_operation_in_memory(elements_by_id: dict, script: models.Script, operation_data: dict, user: models.User, temp_id_mapping: dict):
    """Apply a single operation to in-memory element state, mimicking frontend logic."""
    
    operation_type = operation_data.get("type")
    
    if operation_type == "REORDER":
        return _apply_reorder_in_memory(elements_by_id, operation_data)
    elif operation_type == "UNGROUP_ELEMENTS":
        return _apply_ungroup_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_ELEMENT":
        return _apply_update_element_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "CREATE_GROUP":
        return _apply_create_group_in_memory(elements_by_id, script.script_id, operation_data, user, temp_id_mapping)
    elif operation_type == "TOGGLE_GROUP_COLLAPSE":
        return _apply_toggle_group_collapse_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_FIELD":
        return _apply_update_field_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "CREATE_ELEMENT":
        return _apply_create_element_in_memory(elements_by_id, script.script_id, operation_data, user, temp_id_mapping)
    elif operation_type == "DELETE_ELEMENT":
        return _apply_delete_element_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_TIME_OFFSET":
        return _apply_update_time_offset_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "BULK_REORDER":
        return _apply_bulk_reorder_in_memory(elements_by_id, operation_data)
    elif operation_type == "BULK_OFFSET_ADJUSTMENT":
        return _apply_bulk_offset_adjustment_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "ENABLE_AUTO_SORT":
        return _apply_enable_auto_sort_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "DISABLE_AUTO_SORT":
        return _apply_disable_auto_sort_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "BATCH_COLLAPSE_GROUPS":
        return _apply_batch_collapse_groups_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_GROUP_WITH_PROPAGATION":
        return _apply_update_group_with_propagation_in_memory(elements_by_id, operation_data, user)
    elif operation_type == "UPDATE_SCRIPT_INFO":
        return _apply_update_script_info_in_memory(script, operation_data, user)
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
    from datetime import datetime, timezone
    
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
    
    # Store the sequence of the group element before deletion for resequencing
    deleted_sequence = group_element.sequence
    
    # Remove the group parent element from the in-memory dict
    del elements_by_id[group_element_id]
    
    # Resequence elements: shift all elements with sequence > deleted_sequence down by 1
    elements_resequenced = 0
    for element in elements_by_id.values():
        if element.sequence > deleted_sequence:
            element.sequence = element.sequence - 1
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            elements_resequenced += 1
    
    return {
        "operation": "ungroup_elements",
        "group_element_id": group_element_id,
        "updated_children": updated_children,
        "elements_resequenced": elements_resequenced,
        "group_deleted": True,
        "element_to_delete": group_element_id  # Track for actual database deletion
    }


def _apply_update_element_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_ELEMENT operation in-memory."""
    from datetime import datetime, timezone
    
    element_id = operation_data.get("element_id")
    changes = operation_data.get("changes", {})
    
    # Find the element
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Apply all field changes safely
    updated_fields = []
    offset_changed = False
    for field, change in changes.items():
        new_value = change.get("new_value")
        # Skip None to avoid nulling non-null columns
        if new_value is None:
            continue
        # Coerce known types
        if field == 'is_collapsed':
            if isinstance(new_value, str):
                lowered = new_value.strip().lower()
                new_value = lowered in ('true', '1', 'yes', 'y')
            else:
                new_value = bool(new_value)
        elif field in ('offset_ms', 'duration_ms', 'sequence', 'group_level'):
            try:
                new_value = int(new_value)
            except Exception:
                continue
        setattr(element, field, new_value)
        updated_fields.append(field)
        if field == "offset_ms":
            offset_changed = True
    
    # Update metadata
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    # If offset_ms was changed and this element has a parent group, recalculate group duration
    if offset_changed and element.parent_element_id:
        parent_group = elements_by_id.get(str(element.parent_element_id))
        if parent_group and parent_group.element_type == models.ElementType.GROUP:
            # Find all children of this group
            child_elements = [
                el for el in elements_by_id.values() 
                if el.parent_element_id == element.parent_element_id
            ]
            
            if child_elements:
                # Calculate new group duration from child time offsets
                child_offsets = [el.offset_ms for el in child_elements]
                min_offset = min(child_offsets)
                max_offset = max(child_offsets)
                group_duration_ms = max_offset - min_offset
                
                # Update parent group duration
                parent_group.duration_ms = group_duration_ms
                parent_group.updated_by = user.user_id
                parent_group.date_updated = datetime.now(timezone.utc)
    
    return {
        "operation": "update_element",
        "element_id": element_id,
        "updated_fields": updated_fields
    }


def _apply_create_group_in_memory(elements_by_id: dict, script_id: UUID, operation_data: dict, user, temp_id_mapping: dict = None):
    """Apply CREATE_GROUP operation in-memory."""
    from datetime import datetime, timezone
    import uuid
    
    group_name = operation_data.get("group_name", "Untitled Group")
    element_ids = operation_data.get("element_ids", [])
    custom_color = operation_data.get("custom_color", "#E2E8F0")
    
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
    
    # SEQUENCE MANAGEMENT: Shift existing elements up to make room for group parent
    elements_shifted = 0
    for element in elements_by_id.values():
        if element.sequence >= min_sequence:
            element.sequence = element.sequence + 1
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            elements_shifted += 1
    
    # Create group parent element (simulate database object)
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
        sequence=min_sequence,  # Group takes the original min_sequence position
        offset_ms=min_time,
        duration_ms=group_duration,
        element_name=group_name,
        custom_color=custom_color,
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
    
    # Store temp ID mapping if provided - handle multiple temp ID formats
    temp_id = operation_data.get("element_id")
    element_data_temp_id = operation_data.get("element_data", {}).get("element_id")
    
    if temp_id and temp_id_mapping is not None:
        temp_id_mapping[temp_id] = group_id
        
    # Also map element_data temp ID if different (frontend sometimes sends both)
    if element_data_temp_id and element_data_temp_id != temp_id and temp_id_mapping is not None:
        temp_id_mapping[element_data_temp_id] = group_id
        
    # Store timestamp-based mapping for related operations (frontend inconsistency fix)
    # Extract timestamp pattern from temp ID like "group-1756502143188-..."
    if temp_id and "group-" in temp_id and temp_id_mapping is not None:
        import re
        timestamp_match = re.search(r'group-(\d+)-', temp_id)
        if timestamp_match:
            timestamp = timestamp_match.group(1)
            # Map any other temp IDs with the same timestamp to this group
            temp_id_mapping[f"group-{timestamp}"] = group_id
    
    # DON'T update child elements here - defer until after parent is inserted
    return {
        "operation": "create_group",
        "group_parent_id": group_id,
        "grouped_element_ids": element_ids,
        "group_name": group_name,
        "elements_shifted": elements_shifted,
        "group_inserted_at_sequence": min_sequence,
        "deferred_child_updates": [
            {
                "element_id": str(el.element_id),
                "parent_element_id": group_id,
                "group_level": 1
            } for el in elements_to_group
        ]
    }



def _apply_toggle_group_collapse_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply TOGGLE_GROUP_COLLAPSE operation in-memory."""
    from datetime import datetime, timezone

    element_id = operation_data.get("element_id")
    target_collapsed_state = operation_data.get("target_collapsed_state")

    # Find the group element
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")

    # Ensure target_collapsed_state is a valid boolean, defaulting to False if None
    if target_collapsed_state is None:
        target_collapsed_state = False
    else:
        target_collapsed_state = bool(target_collapsed_state)

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
    from datetime import datetime, timezone
    
    element_id = operation_data.get("element_id")
    field = operation_data.get("field")
    new_value = operation_data.get("new_value")
    
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Skip None writes
    if new_value is None:
        return {
            "operation": "update_field",
            "element_id": element_id,
            "field": field,
            "skipped": True
        }
    # Coerce known types
    if field == 'is_collapsed':
        if isinstance(new_value, str):
            lowered = new_value.strip().lower()
            new_value = lowered in ('true', '1', 'yes', 'y')
        else:
            new_value = bool(new_value)
    elif field in ('offset_ms', 'duration_ms', 'sequence', 'group_level'):
        try:
            new_value = int(new_value)
        except Exception:
            return {
                "operation": "update_field",
                "element_id": element_id,
                "field": field,
                "invalid": True
            }
    # Debug logging for department changes
    if field == "department_id":
        old_value = getattr(element, field, None)
        logger.info(f"🏢 UPDATE_FIELD: Changing department_id for element {element_id} from {old_value} to {new_value}")
    
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
    from datetime import datetime, timezone
    import uuid
    
    element_data = operation_data.get("element_data", {})
    insert_index = operation_data.get("insert_index")
    
    new_element_id = str(uuid.uuid4())
    
    # Create a mock element object
    class MockElement:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    # Calculate sequence based on insert_index, incoming sequence, or append to end
    incoming_sequence = element_data.get('sequence')
    if insert_index is not None:
        # Find elements with sequence >= insert_index and increment them
        for element in elements_by_id.values():
            if element.sequence >= insert_index:
                element.sequence += 1
        new_sequence = insert_index
    elif incoming_sequence is not None:
        # Use sequence from frontend
        new_sequence = incoming_sequence
    else:
        # Append to end
        max_sequence = max(el.sequence for el in elements_by_id.values()) if elements_by_id else 0
        new_sequence = max_sequence + 1
    
    # Remove explicitly provided parameters from element_data
    explicit_params = {'element_id', 'script_id', 'sequence', 'created_by', 'updated_by', 'date_created', 'date_updated', 'created_at', 'updated_at'}
    element_data_clean = {k: v for k, v in element_data.items() if k not in explicit_params}
    
    new_element = MockElement(
        element_id=new_element_id,
        script_id=script_id,
        sequence=new_sequence,
        created_by=user.user_id,
        updated_by=user.user_id,
        date_created=datetime.now(timezone.utc),
        date_updated=datetime.now(timezone.utc),
        **element_data_clean
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
    from datetime import datetime, timezone
    
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
        "deleted_sequence": deleted_sequence,
        "element_to_delete": element_id
    }


def _apply_update_time_offset_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply UPDATE_TIME_OFFSET operation in-memory."""
    from datetime import datetime, timezone
    
    element_id = operation_data.get("element_id")
    new_offset_ms = operation_data.get("new_offset_ms")
    
    element = elements_by_id.get(element_id)
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    element.offset_ms = new_offset_ms
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    # If this element has a parent group, recalculate the group's duration
    if element.parent_element_id:
        parent_group = elements_by_id.get(str(element.parent_element_id))
        if parent_group and parent_group.element_type == models.ElementType.GROUP:
            # Find all children of this group
            child_elements = [
                el for el in elements_by_id.values() 
                if el.parent_element_id == element.parent_element_id
            ]
            
            if child_elements:
                # Calculate new group duration from child time offsets
                child_offsets = [el.offset_ms for el in child_elements]
                min_offset = min(child_offsets)
                max_offset = max(child_offsets)
                group_duration_ms = max_offset - min_offset
                
                # Update parent group duration
                parent_group.duration_ms = group_duration_ms
                parent_group.updated_by = user.user_id
                parent_group.date_updated = datetime.now(timezone.utc)
    
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


def _apply_bulk_offset_adjustment_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply BULK_OFFSET_ADJUSTMENT to a specific set of element IDs only."""
    from datetime import datetime, timezone
    
    affected_ids = set(operation_data.get("affected_element_ids", []) or [])
    delay_ms = int(operation_data.get("delay_ms", 0) or 0)
    if not affected_ids or delay_ms == 0:
        return {
            "operation": "bulk_offset_adjustment",
            "updated_count": 0
        }
    
    updated_count = 0
    for el_id, element in elements_by_id.items():
        if el_id in affected_ids:
            try:
                element.offset_ms = int(element.offset_ms) + delay_ms
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
                updated_count += 1
            except Exception:
                # Skip elements with invalid offset_ms
                continue
    
    return {
        "operation": "bulk_offset_adjustment",
        "updated_count": updated_count,
        "delay_ms": delay_ms
    }


def _apply_enable_auto_sort_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply ENABLE_AUTO_SORT operation in-memory - full resequencing by time."""
    from datetime import datetime, timezone
    
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


def _apply_batch_collapse_groups_in_memory(elements_by_id: dict, operation_data: dict, user):
    """Apply BATCH_COLLAPSE_GROUPS operation in-memory."""
    from datetime import datetime, timezone
    
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
    from datetime import datetime, timezone
    
    element_id = operation_data.get("element_id")
    field_updates = operation_data.get("field_updates", {})
    offset_delta_ms = operation_data.get("offset_delta_ms", 0)
    affected_children = operation_data.get("affected_children", [])
    
    # Update the group element
    element = elements_by_id.get(element_id)
    if element:
        # Defensive: do not overwrite non-nullable fields with None from the client
        for field, value in field_updates.items():
            # Skip None values to avoid unintentionally nulling columns
            if value is None:
                # Special-case: keep existing is_collapsed when client sends null/undefined
                continue
            # Coerce types for known fields
            if field == 'is_collapsed':
                # Accept truthy strings/ints and coerce to bool
                if isinstance(value, str):
                    lowered = value.strip().lower()
                    value = lowered in ('true', '1', 'yes', 'y')
                else:
                    value = bool(value)
            elif field in ('offset_ms', 'duration_ms', 'sequence'):
                try:
                    value = int(value)
                except Exception:
                    continue  # Skip invalid numeric values
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


def _apply_update_script_info_in_memory(script: models.Script, operation_data: dict, user: models.User):
    """Apply UPDATE_SCRIPT_INFO operation to in-memory script object."""
    from datetime import datetime, timezone
    
    changes = operation_data.get("changes", {})
    
    # Apply changes with proper type conversion
    for field, change_data in changes.items():
        new_value = change_data.get("new_value")
        
        old_value = getattr(script, field, None)
        setattr(script, field, new_value)
    
    script.updated_by = user.user_id
    script.date_updated = datetime.now(timezone.utc)
    
    
    return {
        "operation": "update_script_info",
        "script_id": str(script.script_id),
        "changes_count": len(changes)
    }


def batch_update_from_edit_queue(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest,
    user: models.User,
    db: Session
):
    """Process a batch of edit queue operations in-memory, then commit all changes atomically."""
    
    
    # Process all operations together in unified in-memory system
    operations = batch_request.operations
    
    # Load all elements once at the start
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).order_by(models.ScriptElement.sequence.asc()).all()
    
    # Load script object once for metadata operations
    script = db.query(models.Script).filter(models.Script.script_id == script_id).first()
    if not script:
        raise ValueError(f"Script {script_id} not found")
    
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
    deferred_child_updates = []  # Track child updates to apply after parents are inserted
    deleted_element_ids = []  # Track elements that need to be deleted from database
    
    try:
        # Process all operations in-memory, sequentially
        for operation_data in operations:
            try:
                # Apply temporary ID mapping before processing  
                element_id = operation_data.get("element_id")
                if element_id and temp_id_mapping:
                    # Direct mapping first
                    if element_id in temp_id_mapping:
                        operation_data["element_id"] = temp_id_mapping[element_id]
                    # Timestamp-based fallback for inconsistent temp IDs
                    elif element_id.startswith("group-"):
                        import re
                        timestamp_match = re.search(r'group-(\d+)-', element_id)
                        if timestamp_match:
                            timestamp = timestamp_match.group(1)
                            timestamp_key = f"group-{timestamp}"
                            if timestamp_key in temp_id_mapping:
                                operation_data["element_id"] = temp_id_mapping[timestamp_key]
                            else:
                                logger.warning(f"❌ No mapping found for temp ID {element_id} or timestamp {timestamp_key}")
                                logger.warning(f"❌ Available mappings: {list(temp_id_mapping.keys())}")
                
                # Process operation on in-memory state
                result = _apply_operation_in_memory(
                    elements_by_id, script, operation_data, user, temp_id_mapping
                )
                
                # Check for deferred child updates from CREATE_GROUP operations
                if result and result.get("deferred_child_updates"):
                    deferred_child_updates.extend(result["deferred_child_updates"])
                    
                # Check for element deletions from UNGROUP operations
                if result and result.get("element_to_delete"):
                    element_id_to_track = result["element_to_delete"]
                    logger.info(f"Tracking element for deletion: {element_id_to_track}")
                    deleted_element_ids.append(element_id_to_track)
                
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
        
        # Handle new elements and modifications with proper ordering for CREATE_GROUP
        # Step 1: First, insert all new GROUP elements (parents must exist before children reference them)
        for element_id_str, element in elements_by_id.items():
            if element_id_str not in original_sequences:
                # New element - check if it's a GROUP element
                if (hasattr(element, '__class__') and 'MockElement' in str(element.__class__) and 
                    hasattr(element, 'element_type') and element.element_type == models.ElementType.GROUP):
                    
                    # Convert MockElement to actual database model
                    db_element = models.ScriptElement()
                    
                    # Set the element_id FIRST before copying other attributes (convert string to UUID)
                    from uuid import UUID
                    db_element.element_id = UUID(element.element_id) if isinstance(element.element_id, str) else element.element_id
                    
                    # Copy all other attributes from MockElement to database model
                    for attr_name in dir(element):
                        if not attr_name.startswith('_') and attr_name != 'element_id':  # Skip element_id since we set it explicitly
                            attr_value = getattr(element, attr_name)
                            if hasattr(db_element, attr_name) and not callable(attr_value):
                                setattr(db_element, attr_name, attr_value)
                    
                    db.add(db_element)
        
        # Flush to ensure GROUP elements are inserted before child updates
        db.flush()
        
        # Apply deferred child updates now that parent groups exist
        for child_update in deferred_child_updates:
            element_id = child_update["element_id"]
            if element_id in elements_by_id:
                element = elements_by_id[element_id]
                element.parent_element_id = child_update["parent_element_id"]
                element.group_level = child_update["group_level"]
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
        
        # Handle element deletions (e.g., from UNGROUP operations)
        for element_id_to_delete in deleted_element_ids:
            # Find and delete the element from the database
            element_to_delete = db.query(models.ScriptElement).filter(
                models.ScriptElement.element_id == element_id_to_delete
            ).first()
            if element_to_delete:
                db.delete(element_to_delete)
            else:
                logger.warning(f"Element to delete not found in database: {element_id_to_delete}")
        
        # Step 2: Handle all other new elements (non-GROUP)
        for element_id_str, element in elements_by_id.items():
            if element_id_str not in original_sequences:
                # New element - check if it's NOT a GROUP element
                if (hasattr(element, '__class__') and 'MockElement' in str(element.__class__) and 
                    (not hasattr(element, 'element_type') or element.element_type != models.ElementType.GROUP)):
                    
                    # Convert MockElement to actual database model
                    db_element = models.ScriptElement()
                    
                    # Copy all attributes from MockElement to database model
                    for attr_name in dir(element):
                        if not attr_name.startswith('_'):
                            attr_value = getattr(element, attr_name)
                            if hasattr(db_element, attr_name) and not callable(attr_value):
                                setattr(db_element, attr_name, attr_value)
                    
                    db.add(db_element)
            elif original_sequences.get(element_id_str) != element.sequence:
                # Existing element with sequence change - already tracked by SQLAlchemy
                pass
        
        # FINAL STEP: Normalize non-nullable fields before any DB write
        for el in elements_by_id.values():
            # Normalize is_collapsed to False if missing/None to satisfy NOT NULL constraint
            if hasattr(el, 'is_collapsed') and getattr(el, 'is_collapsed') is None:
                setattr(el, 'is_collapsed', False)
            # Ensure group_level is an int
            if hasattr(el, 'group_level') and getattr(el, 'group_level') is None:
                setattr(el, 'group_level', 0)

        # FINAL STEP: Check if auto-sort is enabled and resequence by time before commit
        from utils.user_preferences import get_bit, USER_PREFERENCE_BITS
        
        user_preferences_bitmap = user.user_prefs_bitmap or 0
        auto_sort_enabled = get_bit(user_preferences_bitmap, USER_PREFERENCE_BITS['auto_sort_cues'])
        
        if auto_sort_enabled:
            
            # Get all elements sorted by time, then by original sequence for ties
            elements_list = list(elements_by_id.values())
            elements_sorted_by_time = sorted(elements_list, key=lambda el: (el.offset_ms, el.sequence))
            
            # Assign new sequences based on time order
            for index, element in enumerate(elements_sorted_by_time):
                new_sequence = index + 1
                if element.sequence != new_sequence:
                    element.sequence = new_sequence
                    element.updated_by = user.user_id
                    element.date_updated = datetime.now(timezone.utc)
        
        # Check if any operations failed BEFORE committing
        failed_operations = [r for r in operation_results if r.get("status") == "error"]
        total_operations = len(batch_request.operations)
        
        if failed_operations:
            # If ANY operation failed, rollback and fail the entire batch
            db.rollback()
            error_details = "; ".join([f"Op {r['operation_id']}: {r['error']}" for r in failed_operations])
            logger.error(f"🚨 BATCH FAILED - {len(failed_operations)}/{total_operations} operations failed: {error_details}")
            raise HTTPException(
                status_code=422, 
                detail=f"Save failed: {len(failed_operations)}/{total_operations} operations failed. {error_details}"
            )
        
        # All operations succeeded - commit atomically
        db.commit()
        
        
        return {
            "success": True,
            "message": f"All {total_operations} operations processed successfully",
            "script_id": str(script_id),
            "operations_count": processed_operations,
            "results": operation_results
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to process batch operations for script {script_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process batch operations: {str(e)}")
