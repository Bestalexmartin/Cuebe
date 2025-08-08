# backend/routers/script_elements/routes.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List, Optional
import logging

import models
import schemas
from database import get_db
from ..auth import get_current_user
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
    ).filter(models.Script.script_id == script_id).first()
    
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Security check: ensure user owns the show
    if script.show.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this script")
    
    # Build query with filters and include department relationship
    query = db.query(models.ScriptElement).options(
        joinedload(models.ScriptElement.department)
    ).filter(models.ScriptElement.script_id == script_id)
    
    if active_only:
        query = query.filter(models.ScriptElement.is_active == True)
    
    if element_type:
        try:
            element_type_enum = models.ElementType(element_type.lower())
            query = query.filter(models.ScriptElement.element_type == element_type_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid element type: {element_type}")
    
    if department_id:
        query = query.filter(models.ScriptElement.department_id == department_id)
    
    # Order by sequence only (user's manual order)
    query = query.order_by(
        models.ScriptElement.sequence.asc()
    )
    
    # Apply pagination
    elements = query.offset(skip).limit(limit).all()
    
    # Auto-populate SHOW START cue duration if missing
    from .helpers import _auto_populate_show_start_duration
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