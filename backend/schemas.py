# backend/schemas.py

from pydantic import BaseModel, model_validator, field_validator
from datetime import date, timedelta, datetime
from uuid import UUID
from typing import List, Optional

# This is the schema for an element coming FROM the database
class ScriptElementFromDB(BaseModel):
    elementID: int
    scriptID: int
    timeOffset: timedelta

    class Config:
        from_attributes = True

# This is the schema for an element going TO the frontend
class ScriptElement(BaseModel):
    elementID: int
    scriptID: int
    departmentID: int | None = None
    elementType: str
    elementOrder: int
    cueNumber: str | None = None
    elementDescription: str | None = None
    timeOffset: int # The final output type will be an integer

    class Config:
        from_attributes = True

    # This validator runs before other validation and handles the conversion
    @field_validator('timeOffset', mode='before')
    @classmethod
    def format_timedelta_to_seconds(cls, v):
        if isinstance(v, timedelta):
            return int(v.total_seconds())
        return v

class Script(BaseModel):
    scriptID: int
    scriptName: str
    scriptStatus: str
    showID: UUID
    dateUpdated: datetime
    
    # This will be a list of ScriptElement schemas
    elements: List[ScriptElement] = []

    class Config:
        from_attributes = True

class ScriptCreate(BaseModel):
    scriptName: str | None = None

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

class Show(BaseModel):
    showID: UUID
    ownerID: int
    showName: str
    venue: Optional[Venue] = None  # Changed from showVenue to venue relationship
    showDate: date | None = None
    dateUpdated: datetime
    
    # We will just return the full list of scripts
    scripts: List['Script'] = []

    class Config:
        from_attributes = True

class ShowCreate(BaseModel):
    showName: str
    venueID: Optional[int] = None  # Changed from showVenue: str
    showDate: Optional[date] = None
    deadline: datetime | None = None
        
class User(BaseModel):
    ID: int
    clerk_user_id: str
    emailAddress: str
    
    class Config:
        from_attributes = True

class GuestLinkCreate(BaseModel):
    departmentID: int
    linkName: Optional[str] = None

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

class CrewMemberCreate(BaseModel):
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userRole: str