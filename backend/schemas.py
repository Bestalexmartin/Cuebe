# backend/schemas.py

from pydantic import BaseModel
from datetime import date
from uuid import UUID

# Schema for the data we expect when CREATING a show
class ShowCreate(BaseModel):
    showName: str
    showVenue: str | None = None
    showDate: date | None = None

# Schema for the data we will RETURN to the client
class Show(ShowCreate):
    showID: UUID # <-- Corrected from int
    ownerID: int

    class Config:
        from_attributes = True

class ScriptElement(BaseModel):
    elementID: int
    scriptID: int
    departmentID: int | None = None
    elementType: str
    elementOrder: int
    cueNumber: str | None = None
    elementDescription: str | None = None
    timeOffset: int # <-- We simply declare that we want an integer

    class Config:
        from_attributes = True # This was orm_mode in Pydantic v1

class Script(BaseModel):
    scriptID: int
    scriptName: str
    scriptStatus: str
    showID: UUID # <-- Corrected from int
    
    elements: list[ScriptElement] = []

    class Config:
        from_attributes = True

class Department(BaseModel):
    departmentID: int
    departmentName: str
    departmentDescription: str | None = None
    departmentColor: str | None = None

    class Config:
        from_attributes = True
        
class User(BaseModel):
    ID: int
    clerk_user_id: str
    userName: str | None = None
    emailAddress: str
    
    class Config:
        from_attributes = True