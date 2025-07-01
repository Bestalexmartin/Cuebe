# backend/schemas.py

from pydantic import BaseModel
from datetime import date

# Schema for the data we expect when CREATING a show
class ShowCreate(BaseModel):
    showName: str
    showVenue: str | None = None
    showDate: date | None = None

# Schema for the data we will RETURN to the client
class Show(ShowCreate):
    showID: int
    ownerID: int

    class Config:
        # Pydantic v2 uses from_attributes = True
        # Pydantic v1 uses orm_mode = True
        from_attributes = True