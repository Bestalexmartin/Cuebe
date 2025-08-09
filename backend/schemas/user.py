# backend/schemas/user.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List

# =============================================================================
# USER SCHEMAS
# =============================================================================

class User(BaseModel):
    user_id: UUID
    clerk_user_id: Optional[str] = None  # Nullable for guest users
    email_address: str
    fullname_first: str
    fullname_last: str
    user_name: Optional[str] = None
    profile_img_url: Optional[str] = None
    phone_number: Optional[str] = None
    user_status: str  # 'guest' or 'verified'
    user_role: str
    created_by: Optional[UUID] = None
    notes: Optional[str] = None
    user_prefs_json: Optional[dict] = None
    is_active: bool
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True

class CrewMemberCreate(BaseModel):
    email_address: str
    fullname_first: str
    fullname_last: str
    user_role: str

class GuestUserCreate(BaseModel):
    email_address: str
    fullname_first: str
    fullname_last: str
    user_role: str = "crew"
    phone_number: Optional[str] = None
    notes: Optional[str] = None

class CrewRelationshipCreate(BaseModel):
    crew_user_id: UUID
    notes: Optional[str] = None

class CrewMemberWithRelationship(BaseModel):
    """User data combined with relationship notes for crew management"""
    # User fields
    user_id: UUID
    clerk_user_id: Optional[str] = None
    email_address: str
    fullname_first: str
    fullname_last: str
    user_name: Optional[str] = None
    profile_img_url: Optional[str] = None
    phone_number: Optional[str] = None
    user_status: str
    user_role: str
    created_by: Optional[UUID] = None
    notes: Optional[str] = None  # Notes from User table
    is_active: bool
    date_created: datetime
    date_updated: datetime
    
    # Relationship fields
    relationship_notes: Optional[str] = None  # Notes from CrewRelationship
    
    class Config:
        from_attributes = True

class UserDepartmentAssignment(BaseModel):
    """Department assignment info for user display"""
    assignment_id: UUID
    show_id: UUID
    show_name: str
    department_id: UUID
    department_name: str
    department_color: Optional[str] = None
    department_initials: Optional[str] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_state: Optional[str] = None
    show_date: Optional[datetime] = None
    role: Optional[str] = None

class CrewMemberWithAssignments(CrewMemberWithRelationship):
    """Crew member with their department assignments"""
    department_assignments: List[UserDepartmentAssignment] = []