# backend/routers/script_elements/processors.py

from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime, timezone
import models
from utils.datetime_utils import parse_iso_datetime


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
    
    return {
        "updated_count": updated_count,
        "total_changes": len(element_changes)
    }


def _process_create_group_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User, temp_id_mapping: dict = None):
    """Process a group creation operation."""
    
    element_ids = operation_data.get("element_ids", [])
    group_name = operation_data.get("group_name", "Untitled Group")
    custom_color = operation_data.get("custom_color", "#E2E8F0")

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
    
    # Create the group parent element
    group_parent = models.ScriptElement(
        script_id=script_id,
        element_type='GROUP',
        sequence=min_sequence,
        offset_ms=min_time_offset,
        element_name=group_name,
        cue_notes="",  # Leave empty - will be calculated dynamically on frontend
        custom_color=custom_color,

        priority=models.PriorityLevel.NORMAL,
        group_level=0,
        is_collapsed=False,
        parent_element_id=None,
        
        created_by=user.user_id,
        updated_by=user.user_id
    )
    
    db.add(group_parent)
    db.flush()  # Get the ID
    
    # Store temp ID mapping if provided
    temp_id = operation_data.get("element_id")
    if temp_id and temp_id_mapping is not None:
        temp_id_mapping[temp_id] = str(group_parent.element_id)
    
    # Update all grouped elements to be children of the group
    for element in elements_to_group:
        element.parent_element_id = str(group_parent.element_id)
        element.group_level = 1
        element.updated_by = user.user_id
        element.date_updated = datetime.now(timezone.utc)
    
    # SEQUENCE MANAGEMENT: Shift existing elements up to make room for group parent
    # Get all elements for sequence updating
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).all()
    
    elements_shifted = 0
    for element in all_elements:
        if element.sequence >= min_sequence and element.element_id != group_parent.element_id:
            element.sequence = element.sequence + 1
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
            elements_shifted += 1
    
    # Group parent takes the original min_sequence position
    group_parent.sequence = min_sequence
    
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
    
    # Store the sequence of the group element before deletion for resequencing
    deleted_sequence = group_element.sequence
    
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
    
    # Resequence elements: shift all elements with sequence > deleted_sequence down by 1
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).all()
    
    elements_resequenced = 0
    for element in all_elements:
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
            # Convert from string to datetime using central utility
            script.start_time = parse_iso_datetime(new_value)
            updated_fields.append("start_time")
        elif field == "end_time":
            # Convert from string to datetime using central utility
            script.end_time = parse_iso_datetime(new_value)
            updated_fields.append("end_time")
        elif field == "script_notes":
            script.script_notes = new_value
            updated_fields.append("script_notes")
    
    # Update metadata
    script.updated_by = user.user_id
    script.date_updated = datetime.now(timezone.utc)
    return {"script_id": str(script_id), "updated_fields": updated_fields}


def _process_update_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process an update element operation."""
    
    element_id = operation_data.get("element_id")
    changes = operation_data.get("changes", {})
    
    # Find the element to update
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    updated_fields = []
    
    # Apply each field change
    for field, change_data in changes.items():
        new_value = change_data.get("new_value")
        
        if field == "offset_ms":
            element.offset_ms = new_value
            updated_fields.append("offset_ms")
        elif field == "element_name":
            element.element_name = new_value
            updated_fields.append("element_name")
        elif field == "cue_notes":
            element.cue_notes = new_value
            updated_fields.append("cue_notes")
        elif field == "custom_color":
            element.custom_color = new_value
            updated_fields.append("custom_color")
        # Add other fields as needed
    
    # Update metadata
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {"element_id": str(element_id), "updated_fields": updated_fields}


def _process_update_group_with_propagation_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process an update group with propagation operation - handles retiming of child elements."""
    
    element_id = operation_data.get("element_id")
    field_updates = operation_data.get("field_updates", {})
    offset_delta_ms = operation_data.get("offset_delta_ms", 0)
    affected_children = operation_data.get("affected_children", [])
    
    # Find the group element to update
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    updated_fields = []
    
    # Apply field updates to the group element
    for field, value in field_updates.items():
        if field == "offset_ms":
            element.offset_ms = value
            updated_fields.append("offset_ms")
        elif field == "element_name":
            element.element_name = value
            updated_fields.append("element_name")
        elif field == "cue_notes":
            element.cue_notes = value
            updated_fields.append("cue_notes")
        elif field == "custom_color":
            element.custom_color = value
            updated_fields.append("custom_color")
    
    # Update metadata
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    # Propagate offset changes to children
    children_updated = 0
    if offset_delta_ms != 0 and affected_children:
        child_elements = db.query(models.ScriptElement).filter(
            and_(
                models.ScriptElement.element_id.in_([UUID(child_id) for child_id in affected_children]),
                models.ScriptElement.script_id == script_id
            )
        ).all()
        
        for child in child_elements:
            child.offset_ms += offset_delta_ms
            child.updated_by = user.user_id
            child.date_updated = datetime.now(timezone.utc)
            children_updated += 1
    
    return {
        "element_id": str(element_id),
        "updated_fields": updated_fields,
        "offset_delta_ms": offset_delta_ms,
        "children_updated": children_updated
    }


def _process_create_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a create element operation with proper sequence management."""
    
    element_data = operation_data.get("element_data", {})
    insert_index = operation_data.get("insert_index")
    
    # Calculate sequence based on insert_index, incoming sequence, or append to end
    incoming_sequence = element_data.get('sequence')
    
    if insert_index is not None:
        # Shift existing elements to make room at insert_index
        all_elements = db.query(models.ScriptElement).filter(
            models.ScriptElement.script_id == script_id
        ).all()
        
        elements_shifted = 0
        for element in all_elements:
            if element.sequence >= insert_index:
                element.sequence += 1
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
                elements_shifted += 1
        
        new_sequence = insert_index
    elif incoming_sequence is not None:
        # Use sequence from frontend
        new_sequence = incoming_sequence
    else:
        # Append to end
        max_sequence_result = db.query(models.ScriptElement.sequence).filter(
            models.ScriptElement.script_id == script_id
        ).order_by(models.ScriptElement.sequence.desc()).first()
        max_sequence = max_sequence_result.sequence if max_sequence_result else 0
        new_sequence = max_sequence + 1
    
    # Preserve frontend timestamps if available
    incoming_date_created = element_data.get('date_created') or element_data.get('created_at')
    incoming_date_updated = element_data.get('date_updated') or element_data.get('updated_at')
    
    # Parse frontend timestamps if they're strings
    date_created = None
    date_updated = None
    
    if isinstance(incoming_date_created, str):
        try:
            date_created = parse_iso_datetime(incoming_date_created)
        except:
            date_created = None
    elif incoming_date_created:
        date_created = incoming_date_created
    
    if isinstance(incoming_date_updated, str):
        try:
            date_updated = parse_iso_datetime(incoming_date_updated)
        except:
            date_updated = None
    elif incoming_date_updated:
        date_updated = incoming_date_updated
    
    # Remove explicitly handled parameters to prevent conflicts
    element_data_clean = {k: v for k, v in element_data.items() 
                         if k not in {'sequence', 'date_created', 'date_updated', 'created_at', 'updated_at'}}
    
    # Create new element from provided data
    new_element = models.ScriptElement(
        script_id=script_id,
        sequence=new_sequence,
        element_type=element_data_clean.get("element_type", "CUE"),
        offset_ms=element_data_clean.get("offset_ms", 0),
        element_name=element_data_clean.get("element_name", "New Element"),
        cue_notes=element_data_clean.get("cue_notes", ""),
        custom_color=element_data_clean.get("custom_color"),
        department_id=element_data_clean.get("department_id"),
        priority=element_data_clean.get("priority", models.PriorityLevel.NORMAL),
        group_level=element_data_clean.get("group_level", 0),
        is_collapsed=element_data_clean.get("is_collapsed", False),
        parent_element_id=element_data_clean.get("parent_element_id"),
        created_by=user.user_id,
        updated_by=user.user_id,
        date_created=date_created or datetime.now(timezone.utc),
        date_updated=date_updated or datetime.now(timezone.utc)
    )
    
    db.add(new_element)
    db.flush()  # Get the ID
    
    return {
        "element_id": str(new_element.element_id),
        "element_type": new_element.element_type,
        "sequence": new_element.sequence
    }


def _process_delete_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a delete element operation with sequence gap closure."""
    
    element_id = operation_data.get("element_id")
    
    # Find the element to delete
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Store sequence before deletion for gap closure
    deleted_sequence = element.sequence
    
    # Store info for response before deletion
    element_info = {
        "element_id": str(element_id),
        "element_name": element.element_name,
        "element_type": element.element_type,
        "deleted_sequence": deleted_sequence
    }
    
    # Delete the element
    db.delete(element)
    
    # Close the sequence gap by shifting elements down
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).all()
    
    elements_resequenced = 0
    for remaining_element in all_elements:
        if remaining_element.sequence > deleted_sequence:
            remaining_element.sequence -= 1
            remaining_element.updated_by = user.user_id
            remaining_element.date_updated = datetime.now(timezone.utc)
            elements_resequenced += 1
    
    element_info["elements_resequenced"] = elements_resequenced
    
    return element_info


def _process_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a single element reorder operation with proper cascading updates."""
    
    element_id = operation_data.get("element_id")
    old_sequence = operation_data.get("old_sequence")
    new_sequence = operation_data.get("new_sequence")
    
    if old_sequence == new_sequence:
        return {"element_id": element_id, "new_sequence": new_sequence, "no_change": True}
    
    # Find the element to reorder
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    # Get current sequence from the element (may have changed from previous operations)
    current_sequence = element.sequence
    
    # Check if this is a group parent
    is_group_parent = element.element_type == 'GROUP'
    
    # Get all elements in this script
    all_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.script_id == script_id
    ).all()
    
    # Convert to dict for efficient lookup
    elements_by_id = {str(el.element_id): el for el in all_elements}
    
    if is_group_parent:
        # Get group children
        group_children = [
            el for el in all_elements 
            if el.parent_element_id == str(element.element_id)
        ]
        group_size = len(group_children) + 1  # parent + children
        
        # Apply group reordering logic
        _apply_group_reorder_cascading(elements_by_id, element, group_children, current_sequence, new_sequence, group_size, user)
    else:
        # Apply single element reordering logic
        _apply_single_element_reorder_cascading(elements_by_id, element, current_sequence, new_sequence, user)
    
    return {
        "element_id": str(element_id),
        "old_sequence": current_sequence,
        "new_sequence": element.sequence
    }


def _apply_group_reorder_cascading(elements_by_id: dict, moved_element, group_children: list, old_seq: int, new_seq: int, group_size: int, user: models.User):
    """Apply group reordering using the same two-phase logic as frontend."""
    
    # PHASE 1: Remove group and shift elements up to fill holes
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id or element.parent_element_id == str(moved_element.element_id):
            # Group elements: temporarily give them very high sequences
            element.sequence = 9999 + element.sequence
        elif element.sequence > old_seq + group_size - 1:
            # Elements after the ENTIRE old group footprint: shift up to fill holes
            element.sequence = element.sequence - group_size
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
    
    # PHASE 2: Place group at new position and shift elements down as needed
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id:
            # Group parent: place at new sequence
            element.sequence = new_seq
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
        elif element.parent_element_id == str(moved_element.element_id):
            # Group children: place consecutively after parent
            child_index = next(i for i, child in enumerate(group_children) if child.element_id == element.element_id)
            element.sequence = new_seq + child_index + 1
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)
        elif element.sequence >= new_seq and element.sequence < 9999:
            # Non-group elements at or after new position: shift down by group size
            element.sequence = element.sequence + group_size
            element.updated_by = user.user_id
            element.date_updated = datetime.now(timezone.utc)


def _apply_single_element_reorder_cascading(elements_by_id: dict, moved_element, old_seq: int, new_seq: int, user: models.User):
    """Apply single element reordering using the same logic as frontend."""
    
    # Update the moved element
    moved_element.sequence = new_seq
    moved_element.updated_by = user.user_id
    moved_element.date_updated = datetime.now(timezone.utc)
    
    # Shift other elements
    for element in elements_by_id.values():
        if element.element_id == moved_element.element_id:
            continue  # Skip the moved element itself
            
        if old_seq < new_seq:
            # Moving down: shift elements between old and new positions up
            if old_seq < element.sequence <= new_seq:
                element.sequence = element.sequence - 1
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)
        elif old_seq > new_seq:
            # Moving up: shift elements between new and old positions down
            if new_seq <= element.sequence < old_seq:
                element.sequence = element.sequence + 1
                element.updated_by = user.user_id
                element.date_updated = datetime.now(timezone.utc)