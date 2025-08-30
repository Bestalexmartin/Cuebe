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

# All script element endpoints have been moved to the unified save endpoint in shows.py
# The GET endpoints are no longer needed - data is fetched via unified script endpoint
# The PATCH batch-update endpoint is replaced by POST /scripts/{script_id} unified save