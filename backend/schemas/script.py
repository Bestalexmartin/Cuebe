# backend/schemas/script.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING

from models import ScriptStatus

if TYPE_CHECKING:
    from .script_element import ScriptElement

# =============================================================================
# SCRIPT SCHEMAS
# =============================================================================

class ScriptCreate(BaseModel):
    script_name: Optional[str] = None
    script_notes: Optional[str] = None
    script_status: Optional[ScriptStatus] = None
    end_time: Optional[datetime] = None  # Planned end time

class Script(BaseModel):
    script_id: UUID
    script_name: str
    script_notes: Optional[str] = None
    script_status: ScriptStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None  # Planned end time
    show_id: UUID
    owner_id: UUID  # Missing field needed for authorization
    is_shared: bool = False
    date_created: datetime
    date_updated: datetime
    
    # Forward reference to ScriptElement for complete element data
    elements: Optional[List['ScriptElement']] = []
    
    # Crew context for shared access (only populated on shared endpoints)
    crew_context: Optional[dict] = None

    class Config:
        from_attributes = True

class ScriptUpdate(BaseModel):
    script_name: Optional[str] = None
    script_notes: Optional[str] = None
    script_status: Optional[ScriptStatus] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None  # Planned end time
    is_shared: Optional[bool] = None


class BatchUpdateResponse(BaseModel):
    """Response for batch update operations on script elements"""
    updated_count: int
    total_changes: int