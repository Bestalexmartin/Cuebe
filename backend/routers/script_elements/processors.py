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


def _process_create_group_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
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


def _process_create_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a create element operation."""
    
    element_data = operation_data.get("element_data", {})
    
    # Create new element from provided data
    new_element = models.ScriptElement(
        script_id=script_id,
        element_type=element_data.get("element_type", "CUE"),
        sequence=element_data.get("sequence", 1),
        offset_ms=element_data.get("offset_ms", 0),
        element_name=element_data.get("element_name", "New Element"),
        cue_notes=element_data.get("cue_notes", ""),
        custom_color=element_data.get("custom_color"),
        department_id=element_data.get("department_id"),
        priority=element_data.get("priority", models.PriorityLevel.NORMAL),
        group_level=element_data.get("group_level", 0),
        is_collapsed=element_data.get("is_collapsed", False),
        parent_element_id=element_data.get("parent_element_id"),
        created_by=user.user_id,
        updated_by=user.user_id
    )
    
    db.add(new_element)
    db.flush()  # Get the ID
    
    return {
        "element_id": str(new_element.element_id),
        "element_type": new_element.element_type,
        "sequence": new_element.sequence
    }


def _process_delete_element_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a delete element operation."""
    
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
    
    # Store info for response before deletion
    element_info = {
        "element_id": str(element_id),
        "element_name": element.element_name,
        "element_type": element.element_type
    }
    
    # Delete the element
    db.delete(element)
    
    return element_info


def _process_reorder_operation(db: Session, script_id: UUID, operation_data: dict, user: models.User):
    """Process a single element reorder operation."""
    
    element_id = operation_data.get("element_id")
    new_sequence = operation_data.get("new_sequence")
    
    # Find the element to reorder
    element = db.query(models.ScriptElement).filter(
        and_(
            models.ScriptElement.element_id == UUID(element_id),
            models.ScriptElement.script_id == script_id
        )
    ).first()
    
    if not element:
        raise ValueError(f"Element {element_id} not found")
    
    old_sequence = element.sequence
    element.sequence = new_sequence
    element.updated_by = user.user_id
    element.date_updated = datetime.now(timezone.utc)
    
    return {
        "element_id": str(element_id),
        "old_sequence": old_sequence,
        "new_sequence": new_sequence
    }