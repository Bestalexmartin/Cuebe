# backend/routers/script_elements/routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List, Optional, Union
import logging

import models
import schemas
from database import get_db
from ..auth import get_current_user, get_current_user_optional
from .operations import batch_update_from_edit_queue

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


def _filter_irrelevant_groups(db: Session, elements: list, crew_department_id: str) -> list:
    """Filter out group parents that have no relevant children for this crew member's department."""
    
    # Get all group IDs from the elements list
    group_ids = [el.element_id for el in elements if el.element_type == models.ElementType.GROUP]
    
    if not group_ids:
        return elements  # No groups to filter
    
    # For each group, check if it has any children that would be visible to this crew member
    relevant_group_ids = set()
    
    for group_id in group_ids:
        # Query for children of this group that match crew member's department
        group_children = db.query(models.ScriptElement).filter(
            models.ScriptElement.parent_element_id == group_id,
            models.ScriptElement.department_id == crew_department_id,
            models.ScriptElement.element_type == models.ElementType.CUE
        ).first()
        
        if group_children:
            relevant_group_ids.add(group_id)
    
    # Filter out group parents that have no relevant children
    filtered_elements = []
    for element in elements:
        if element.element_type == models.ElementType.GROUP:
            # Only include group if it has relevant children
            if element.element_id in relevant_group_ids:
                filtered_elements.append(element)
        else:
            # Include all non-group elements (notes and relevant cues already filtered by query)
            filtered_elements.append(element)
    
    return filtered_elements

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

@router.get("/scripts/{script_id}/elements", response_model=Union[List[schemas.ScriptElementEnhanced], schemas.SharedScriptElementsResponse])
def get_script_elements(
    script_id: UUID,
    db: Session = Depends(get_db),
    element_type: Optional[str] = Query(None, description="Filter by element type (cue, note, group)"),
    department_id: Optional[UUID] = Query(None, description="Filter by department ID"),
    skip: int = Query(0, ge=0, description="Number of elements to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of elements to return"),
    share_token: Optional[str] = Query(None, description="Share token for public access"),
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    """Get all elements for a script with optional filtering. Supports both authenticated and token-based access."""
    
    # First verify the script exists
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.script_id == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Access validation: either via share token OR user authentication
    crew_department_id = None  # For departmental filtering
    
    if share_token:
        # Token-based access: validate share token
        crew_assignment = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.show_id == script.show_id
        ).first()
        
        if not crew_assignment:
            raise HTTPException(status_code=404, detail="Invalid share token")
        
        # Ensure script is shared
        if not script.is_shared:
            raise HTTPException(status_code=403, detail="Script is not shared")
        
        # Get crew member's department for filtering
        crew_department_id = crew_assignment.department_id
            
    elif user:
        # User-based access: validate ownership or crew relationship
        if script.show.owner_id != user.user_id:
            # Check for crew relationship
            crew_relationship = db.query(models.CrewRelationship).filter(
                models.CrewRelationship.manager_user_id == script.show.owner_id,
                models.CrewRelationship.crew_user_id == user.user_id,
                models.CrewRelationship.is_active == True
            ).first()
            
            if not crew_relationship:
                raise HTTPException(status_code=403, detail="Not authorized to view this script")
    else:
        # No authentication method provided
        raise HTTPException(status_code=401, detail="Authentication required. Provide either Authorization header or share_token parameter.")
    
    # Build query with filters and include department relationship
    query = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.department)
    ).filter(models.ScriptElement.script_id == script_id)
    
    # Apply departmental filtering for shared access
    if crew_department_id:
        # For shared access, filter to show:
        # 1. All NOTEs (regardless of department)
        # 2. CUEs that match crew member's department
        # 3. GROUP parents (we'll filter these after checking for relevant children)
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.ScriptElement.element_type == models.ElementType.NOTE,
                models.ScriptElement.element_type == models.ElementType.GROUP,
                (models.ScriptElement.element_type == models.ElementType.CUE) & 
                (models.ScriptElement.department_id == crew_department_id)
            )
        )
    
    if element_type:
        try:
            element_type_enum = models.ElementType(element_type.lower())
            query = query.filter(models.ScriptElement.element_type == element_type_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid element type: {element_type}")
    
    if department_id:
        query = query.filter(models.ScriptElement.department_id == department_id)
    
    # Order by offset_ms first (time order), then sequence (for same time)
    query = query.order_by(
        models.ScriptElement.offset_ms.asc(),
        models.ScriptElement.sequence.asc()
    )
    
    # Apply pagination
    all_elements = query.offset(skip).limit(limit).all()
    
    # Post-process to filter out group parents that have no relevant children
    if crew_department_id:
        elements = _filter_irrelevant_groups(db, all_elements, crew_department_id)
    else:
        elements = all_elements
    
    # Auto-populate SHOW START cue duration if missing
    from .helpers import _auto_populate_show_start_duration
    _auto_populate_show_start_duration(db, script, elements)
    
    # For shared access, return elements with crew assignment context
    if crew_department_id and share_token:
        # Get crew assignment details with department and user info
        crew_details = db.query(models.CrewAssignment).options(
            joinedload(models.CrewAssignment.department),
            joinedload(models.CrewAssignment.user)
        ).filter(
            models.CrewAssignment.share_token == share_token,
            models.CrewAssignment.show_id == script.show_id
        ).first()
        
        # Return elements with crew context using proper schema
        crew_context = schemas.CrewContext(
            department_name=crew_details.department.department_name if crew_details and crew_details.department else None,
            department_initials=crew_details.department.department_initials if crew_details and crew_details.department else None,
            department_color=crew_details.department.department_color if crew_details and crew_details.department else None,
            show_role=crew_details.show_role if crew_details else None,
            user_name=f"{crew_details.user.fullname_first} {crew_details.user.fullname_last}" if crew_details and crew_details.user else None
        )
        
        return schemas.SharedScriptElementsResponse(
            elements=elements,
            crew_context=crew_context
        )
    
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
        joinedload(models.ScriptElement.department)
    ).filter(models.ScriptElement.element_id == element_id).first()
    
    if not element:
        raise HTTPException(status_code=404, detail="Script element not found")
    
    # Security check: ensure user owns the show
    if element.script.show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this element")
    
    return element

# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.patch("/scripts/{script_id}/elements/batch-update")
def batch_update_script_elements(
    script_id: UUID,
    batch_request: schemas.EditQueueBatchRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process a batch of edit queue operations."""
    return batch_update_from_edit_queue(script_id, batch_request, user, db)