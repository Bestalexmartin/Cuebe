# backend/routers/script_import.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from database import get_db
from routers.auth import get_current_user
from models import User, Script, ScriptElement, Department, Show
from schemas.script_import import (
    CleanScriptImportRequest,
    ScriptImportValidationResponse,
    ScriptImportSuccessResponse,
    ScriptImportErrorResponse,
    ImportValidationError,
    ImportValidationWarning,
    DepartmentSuggestion,
    ElementType,
    PriorityLevel,
    ScriptStatus
)

router = APIRouter(prefix="/api", tags=["script-import"])

def validate_show_access(show_id: UUID, user: User, db: Session) -> Show:
    """Validate user has access to the show"""
    show = db.query(Show).filter(Show.show_id == show_id).first()
    if not show:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Show not found"
        )
    
    # TODO: Add proper show access validation based on your auth model
    # For now, assuming user has access if show exists
    return show

def find_or_create_department(
    department_name: str, 
    user: User, 
    db: Session
) -> tuple[Department, bool]:
    """
    Find existing department or create new one
    Returns (department, was_created)
    """
    if not department_name or department_name.strip() == "":
        return None, False
    
    # Try to find existing department (case-insensitive)
    existing_dept = db.query(Department).filter(
        Department.department_name.ilike(department_name.strip())
    ).first()
    
    if existing_dept:
        return existing_dept, False
    
    # Create new department
    new_department = Department(
        department_id=uuid4(),
        department_name=department_name.strip(),
        department_initials=department_name.strip()[:3].upper(),
        department_color="#6B7280",  # Default gray color
        owner_id=user.user_id
    )
    
    db.add(new_department)
    db.flush()  # Get the ID without committing
    
    return new_department, True

def suggest_department_mappings(
    element_department_names: List[str], 
    db: Session
) -> List[DepartmentSuggestion]:
    """Generate department mapping suggestions"""
    suggestions = []
    unique_names = list(set([name for name in element_department_names if name]))
    
    existing_departments = db.query(Department).all()
    
    # Common theater department aliases
    department_aliases = {
        'LX': 'Lighting',
        'LIGHTS': 'Lighting', 
        'ELECTRIC': 'Lighting',
        'SFX': 'Sound',
        'AUDIO': 'Sound',
        'QLAB': 'Sound',
        'PROPS': 'Properties',
        'PROP': 'Properties',
        'SET': 'Scenic',
        'SCENERY': 'Scenic',
        'COSTUME': 'Costumes',
        'WARDROBE': 'Costumes',
        'HAIR': 'Hair & Makeup',
        'MAKEUP': 'Hair & Makeup',
        'H&M': 'Hair & Makeup',
        'SM': 'Stage Management'
    }
    
    for dept_name in unique_names:
        if not dept_name:
            continue
            
        suggestion = DepartmentSuggestion(original_name=dept_name)
        
        # 1. Exact match (case-insensitive)
        exact_match = next(
            (dept for dept in existing_departments 
             if dept.department_name.lower() == dept_name.lower()), 
            None
        )
        
        if exact_match:
            suggestion.suggested_department_id = exact_match.department_id
            suggestion.suggested_department_name = exact_match.department_name
            suggestion.confidence = 'exact'
        else:
            # 2. Alias match
            alias_target = department_aliases.get(dept_name.upper())
            if alias_target:
                alias_match = next(
                    (dept for dept in existing_departments 
                     if dept.department_name.lower() == alias_target.lower()), 
                    None
                )
                if alias_match:
                    suggestion.suggested_department_id = alias_match.department_id
                    suggestion.suggested_department_name = alias_match.department_name
                    suggestion.confidence = 'alias'
                else:
                    suggestion.suggested_department_name = alias_target
                    suggestion.confidence = 'none'
                    suggestion.should_create_new = True
            else:
                # 3. Fuzzy match
                fuzzy_match = next(
                    (dept for dept in existing_departments 
                     if (dept_name.lower() in dept.department_name.lower() or 
                         dept.department_name.lower() in dept_name.lower())), 
                    None
                )
                
                if fuzzy_match:
                    suggestion.suggested_department_id = fuzzy_match.department_id
                    suggestion.suggested_department_name = fuzzy_match.department_name
                    suggestion.confidence = 'fuzzy'
                else:
                    suggestion.confidence = 'none'
                    suggestion.should_create_new = True
        
        suggestions.append(suggestion)
    
    return suggestions

def resolve_group_hierarchy(sorted_elements: List[Dict]) -> List[Dict]:
    """
    Resolve parent-child relationships for group hierarchy
    Based on group_level and sequence order
    """
    resolved_elements = []
    group_stack = []  # Stack to track parent groups at each level
    
    for element_data in sorted_elements:
        current_level = element_data.get('group_level', 0)
        
        # Adjust group stack to match current level
        while len(group_stack) > current_level:
            group_stack.pop()
        
        # Set parent based on group stack
        if len(group_stack) > 0:
            element_data['parent_element_id'] = group_stack[-1]['element_id']
        else:
            element_data['parent_element_id'] = None
        
        # If this is a GROUP element, add it to the group stack
        if element_data.get('element_type') == 'GROUP':
            # Ensure group stack has the right length
            while len(group_stack) < current_level:
                group_stack.append(None)  # Fill gaps if needed
            
            if len(group_stack) == current_level:
                group_stack.append(element_data)
            else:
                group_stack[current_level] = element_data
        
        resolved_elements.append(element_data)
    
    return resolved_elements

@router.post("/scripts/import/validate", response_model=ScriptImportValidationResponse)
async def validate_script_import(
    import_request: CleanScriptImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate script import data without creating the script
    Returns validation results and suggestions
    """
    try:
        # Validate show access
        show = validate_show_access(import_request.show_id, current_user, db)
        
        errors = []
        warnings = []
        
        # Validate script name uniqueness within show
        existing_script = db.query(Script).filter(
            and_(
                Script.show_id == import_request.show_id,
                Script.script_name.ilike(import_request.script_metadata.script_name.strip())
            )
        ).first()
        
        if existing_script:
            errors.append(ImportValidationError(
                field="script_name",
                message=f"Script '{import_request.script_metadata.script_name}' already exists in this show"
            ))
        
        # Validate elements
        element_names = set()
        element_department_names = []
        
        for i, element in enumerate(import_request.script_elements):
            # Check for duplicate element names
            if element.element_name in element_names:
                warnings.append(ImportValidationWarning(
                    field="element_name",
                    message=f"Duplicate element name: '{element.element_name}'",
                    element_index=i
                ))
            element_names.add(element.element_name)
            
            # Collect department names
            if element.department_name:
                element_department_names.append(element.department_name)
            
            # Validate sequence numbers if provided
            if element.sequence is not None and element.sequence <= 0:
                errors.append(ImportValidationError(
                    field="sequence",
                    message=f"Invalid sequence number: {element.sequence}",
                    element_index=i
                ))
        
        # Generate department suggestions
        department_suggestions = suggest_department_mappings(element_department_names, db)
        
        # Calculate estimated duration
        estimated_duration_ms = None
        if import_request.script_elements:
            max_offset = max(elem.offset_ms for elem in import_request.script_elements)
            last_element_duration = next(
                (elem.duration_ms for elem in import_request.script_elements 
                 if elem.offset_ms == max_offset and elem.duration_ms), 
                0
            )
            estimated_duration_ms = max_offset + (last_element_duration or 0)
        
        return ScriptImportValidationResponse(
            is_valid=len(errors) == 0,
            total_elements=len(import_request.script_elements),
            errors=errors,
            warnings=warnings,
            department_suggestions=department_suggestions,
            estimated_duration_ms=estimated_duration_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )

@router.post("/scripts/import", response_model=ScriptImportSuccessResponse)  
async def import_script(
    import_request: CleanScriptImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import script from validated data
    Creates script, elements, and departments as needed
    """
    try:
        # Validate show access
        show = validate_show_access(import_request.show_id, current_user, db)
        
        # Check script name uniqueness and add timestamp suffix if needed
        original_name = import_request.script_metadata.script_name.strip()
        script_name = original_name
        
        existing_script = db.query(Script).filter(
            and_(
                Script.show_id == import_request.show_id,
                Script.script_name.ilike(script_name)
            )
        ).first()
        
        if existing_script:
            # Add timestamp suffix to make name unique
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            script_name = f"{original_name} - {timestamp}"
        
        # Create the script with proper timing from show
        new_script = Script(
            script_id=uuid4(),
            script_name=script_name,
            script_status=import_request.script_metadata.script_status,
            start_time=import_request.script_metadata.start_time or show.show_date,
            end_time=import_request.script_metadata.end_time or show.show_end,
            script_notes=import_request.script_metadata.script_notes,
            show_id=import_request.show_id,
            owner_id=current_user.user_id,
            is_shared=False
        )
        
        db.add(new_script)
        db.flush()  # Get the script ID
        
        # Process elements and departments
        departments_created = 0
        elements_created = 0
        warnings = []
        department_cache = {}  # Cache to avoid duplicate lookups
        
        # Sort elements by sequence or offset_ms for consistent ordering
        sorted_elements = sorted(
            import_request.script_elements,
            key=lambda x: (x.sequence or 0, x.offset_ms)
        )
        
        # Convert to dict format for hierarchy processing
        element_dicts = []
        for i, element_data in enumerate(sorted_elements):
            element_dict = {
                'element_id': uuid4(),
                'element_type': element_data.element_type,
                'element_name': element_data.element_name,
                'cue_notes': element_data.cue_notes,
                'offset_ms': element_data.offset_ms,
                'duration_ms': element_data.duration_ms,
                'sequence': element_data.sequence or (i + 1),
                'department_name': element_data.department_name,
                'department_id': element_data.department_id,
                'priority': element_data.priority,
                'location_details': element_data.location_details,
                'custom_color': element_data.custom_color,
                'group_level': element_data.group_level,
                'parent_element_id': element_data.parent_element_id
            }
            element_dicts.append(element_dict)
        
        # Resolve group hierarchy if present
        if import_request.import_metadata.has_group_hierarchy:
            element_dicts = resolve_group_hierarchy(element_dicts)
        
        # Find the earliest element at 00:00 to determine where to insert SHOW START
        earliest_zero_offset = None
        for i, element_data in enumerate(element_dicts):
            if element_data['offset_ms'] == 0:
                earliest_zero_offset = i
                break
        
        # Create SHOW START element
        show_start_element = {
            'element_id': uuid4(),
            'element_type': ElementType.NOTE,
            'element_name': 'SHOW START',
            'cue_notes': None,
            'offset_ms': 0,
            'duration_ms': None,
            'sequence': 1,  # Will be recalculated
            'department_name': None,
            'department_id': None,
            'priority': PriorityLevel.CRITICAL,
            'location_details': None,
            'custom_color': '#EF4444',  # Matches frontend note preset red
            'group_level': 0,
            'parent_element_id': None
        }
        
        # Insert SHOW START at the right position
        if earliest_zero_offset is not None:
            # Insert before the first 00:00 element
            element_dicts.insert(earliest_zero_offset, show_start_element)
        else:
            # No 00:00 elements, insert at the beginning
            element_dicts.insert(0, show_start_element)
        
        # Create SHOW END element if show has an end time
        if show.show_end and show.show_date:
            # Calculate runtime in milliseconds
            runtime_delta = show.show_end - show.show_date
            runtime_ms = int(runtime_delta.total_seconds() * 1000)
            
            show_end_element = {
                'element_id': uuid4(),
                'element_type': ElementType.NOTE,
                'element_name': 'SHOW END',
                'cue_notes': None,
                'offset_ms': runtime_ms,
                'duration_ms': None,
                'sequence': len(element_dicts) + 1,  # Will be recalculated
                'department_name': None,
                'department_id': None,
                'priority': PriorityLevel.CRITICAL,
                'location_details': None,
                'custom_color': '#EF4444',  # Matches frontend note preset red
                'group_level': 0,
                'parent_element_id': None
            }
            
            # Add SHOW END at the end
            element_dicts.append(show_end_element)
        
        # Recalculate sequence numbers after insertion
        for i, element_data in enumerate(element_dicts):
            element_data['sequence'] = i + 1
        
        # Prepare bulk save for performance
        new_elements = []
        for i, element_data in enumerate(element_dicts):
            # Handle department association (skip for NOTEs and GROUPs - they don't have departments)
            department_id = None
            if element_data['element_type'] == ElementType.CUE:
                if element_data['department_name']:
                    if element_data['department_name'] not in department_cache:
                        department, was_created = find_or_create_department(
                            element_data['department_name'],
                            current_user,
                            db
                        )
                        if department:
                            department_cache[element_data['department_name']] = department.department_id
                            if was_created:
                                departments_created += 1
                                warnings.append(f"Created new department: {element_data['department_name']}")
                    
                    department_id = department_cache.get(element_data['department_name'])
                elif element_data['department_id']:
                    department_id = element_data['department_id']
            
            # Create script element object (defer adding to session)
            new_element = ScriptElement(
                element_id=element_data['element_id'],
                script_id=new_script.script_id,
                department_id=department_id,
                element_type=element_data['element_type'],
                sequence=element_data['sequence'],
                element_name=element_data['element_name'],
                cue_notes=element_data['cue_notes'],
                offset_ms=element_data['offset_ms'],
                duration_ms=element_data['duration_ms'],
                priority=element_data['priority'],
                location_details=element_data['location_details'],
                custom_color=element_data['custom_color'],
                parent_element_id=element_data['parent_element_id'],
                group_level=element_data['group_level'],
                is_collapsed=False,
                created_by=current_user.user_id,
                updated_by=current_user.user_id
            )
            new_elements.append(new_element)
            elements_created += 1

        # Bulk save all elements in one go
        if new_elements:
            db.bulk_save_objects(new_elements)
        
        # Commit all changes
        db.commit()
        
        return ScriptImportSuccessResponse(
            script_id=new_script.script_id,
            elements_created=elements_created,
            departments_created=departments_created,
            warnings=warnings,
            import_metadata=import_request.import_metadata
        )
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}"
        )
