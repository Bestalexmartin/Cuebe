# backend/schemas.py

from pydantic import BaseModel, model_validator, field_validator
from datetime import date, timedelta, datetime
from uuid import UUID
from typing import List

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
    showID: UUID
    
    # This will be a list of ScriptElement schemas
    elements: List[ScriptElement] = []

    class Config:
        from_attributes = True

class Show(BaseModel):
    showID: UUID
    ownerID: int
    showName: str
    showVenue: str | None = None
    showDate: date | None = None
    dateUpdated: datetime
    
    # We will just return the full list of scripts
    scripts: List['Script'] = []

    class Config:
        from_attributes = True

# Other schemas remain the same
class ShowCreate(BaseModel):
    showName: str
    showVenue: str | None = None
    showDate: date | None = None

class Department(BaseModel):
    departmentID: int
    departmentName: str

    class Config:
        from_attributes = True
        
class User(BaseModel):
    ID: int
    clerk_user_id: str
    emailAddress: str
    
    class Config:
        from_attributes = True