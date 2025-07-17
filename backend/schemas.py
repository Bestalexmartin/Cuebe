# backend/schemas.py

from pydantic import BaseModel, model_validator, field_validator
from datetime import date, timedelta, datetime
from uuid import UUID
from typing import List, Optional

# =============================================================================
# USER SCHEMAS
# =============================================================================

class User(BaseModel):
    ID: int
    clerk_user_id: Optional[str] = None  # Nullable for guest users
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userName: Optional[str] = None
    profileImgURL: Optional[str] = None
    phoneNumber: Optional[str] = None
    userStatus: str  # 'guest' or 'verified'
    userRole: str
    createdBy: Optional[int] = None  # For guest users
    notes: Optional[str] = None
    isActive: bool
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

class CrewMemberCreate(BaseModel):
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userRole: str

class GuestUserCreate(BaseModel):
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userRole: str = "crew"
    phoneNumber: Optional[str] = None
    notes: Optional[str] = None

class CrewRelationshipCreate(BaseModel):
    crew_user_id: int
    notes: Optional[str] = None

# =============================================================================
# VENUE SCHEMAS
# =============================================================================

class VenueBase(BaseModel):
    venueName: str
    address: Optional[str] = None
    capacity: Optional[int] = None
    venueType: Optional[str] = None
    contactName: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    stageWidth: Optional[int] = None
    stageDepth: Optional[int] = None
    flyHeight: Optional[int] = None
    equipment: Optional[List[str]] = None
    notes: Optional[str] = None
    rentalRate: Optional[int] = None
    minimumRental: Optional[int] = None

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    venueID: int
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# DEPARTMENT SCHEMAS
# =============================================================================

class DepartmentCreate(BaseModel):
    departmentName: str
    departmentDescription: Optional[str] = None
    departmentColor: str

class Department(BaseModel):
    departmentID: int
    departmentName: str
    departmentDescription: Optional[str] = None
    departmentColor: str
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# SHOW SCHEMAS
# =============================================================================

class ShowCreate(BaseModel):
    showName: str
    venueID: Optional[int] = None
    showDate: Optional[date] = None
    showNotes: Optional[str] = None
    deadline: Optional[datetime] = None

class Show(BaseModel):
    showID: UUID
    ownerID: int
    showName: str
    venue: Optional[Venue] = None
    showDate: Optional[date] = None
    dateUpdated: datetime
    
    # Forward reference to Script (defined below)
    scripts: List['Script'] = []

    class Config:
        from_attributes = True

# =============================================================================
# SCRIPT SCHEMAS
# =============================================================================

class ScriptCreate(BaseModel):
    scriptName: Optional[str] = None

class Script(BaseModel):
    scriptID: int
    scriptName: str
    scriptStatus: str
    showID: UUID
    dateUpdated: datetime
    
    # Forward reference to ScriptElement (defined below)
    elements: List['ScriptElement'] = []

    class Config:
        from_attributes = True

# =============================================================================
# SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementFromDB(BaseModel):
    """Schema for script elements coming FROM the database"""
    elementID: int
    scriptID: int
    timeOffset: timedelta

    class Config:
        from_attributes = True

class ScriptElement(BaseModel):
    """Schema for script elements going TO the frontend"""
    elementID: int
    scriptID: int
    departmentID: Optional[int] = None
    elementType: str
    elementOrder: int
    cueNumber: Optional[str] = None
    elementDescription: Optional[str] = None
    timeOffset: int  # Converted to seconds for frontend

    class Config:
        from_attributes = True

    @field_validator('timeOffset', mode='before')
    @classmethod
    def format_timedelta_to_seconds(cls, v):
        """Convert timedelta to seconds for frontend consumption"""
        if isinstance(v, timedelta):
            return int(v.total_seconds())
        return v

# =============================================================================
# GUEST ACCESS SCHEMAS
# =============================================================================

class GuestLinkCreate(BaseModel):
    departmentID: int
    linkName: Optional[str] = None