# backend/schemas/show.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from .venue import Venue

from models import UserStatus

if TYPE_CHECKING:
    from .script import Script

# =============================================================================
# SHOW SCHEMAS
# =============================================================================

class ShowCreate(BaseModel):
    show_name: str
    venue_id: Optional[UUID] = None
    show_date: Optional[datetime] = None
    show_end: Optional[datetime] = None  # End time of show
    show_notes: Optional[str] = None
    deadline: Optional[datetime] = None

class CrewAssignment(BaseModel):
    """Schema for show-level crew assignments"""
    assignment_id: UUID
    show_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool
    date_assigned: datetime

    class Config:
        from_attributes = True

class CrewAssignmentCreate(BaseModel):
    """Schema for creating crew assignments"""
    assignment_id: Optional[UUID] = None  # For updates
    show_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool = True

class CrewAssignmentCreateRequest(BaseModel):
    """Schema for creating a single crew assignment"""
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None

class CrewAssignmentUpdateRequest(BaseModel):
    """Schema for updating a single crew assignment"""
    show_role: Optional[str] = None
    is_active: Optional[bool] = None

class CrewAssignmentBulkRequest(BaseModel):
    """Schema for bulk crew assignment updates"""
    assignments: List[CrewAssignmentCreate]

class CrewMemberWithDetails(BaseModel):
    """Schema for crew member with user and department details - used for script sharing"""
    assignment_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool
    date_assigned: datetime
    
    # User details
    fullname_first: str
    fullname_last: str
    email_address: str
    user_status: UserStatus

    # Department details
    department_name: str
    department_color: Optional[str] = None
    department_initials: Optional[str] = None

    class Config:
        from_attributes = True

class Show(BaseModel):
    show_id: UUID
    owner_id: UUID
    show_name: str
    venue: Optional[Venue] = None
    show_date: Optional[datetime] = None
    show_end: Optional[datetime] = None  # End time of show
    show_notes: Optional[str] = None
    deadline: Optional[datetime] = None
    date_created: datetime
    date_updated: datetime
    
    # Forward reference to Script (defined below)
    scripts: List['Script'] = []
    crew: List[CrewAssignment] = []

    class Config:
        from_attributes = True