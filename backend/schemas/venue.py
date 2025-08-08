# backend/schemas/venue.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List

# =============================================================================
# VENUE SCHEMAS
# =============================================================================

class VenueBase(BaseModel):
    venue_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    capacity: Optional[int] = None
    venue_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    stage_width: Optional[int] = None
    stage_depth: Optional[int] = None
    fly_height: Optional[int] = None
    equipment: Optional[List[str]] = None
    venue_notes: Optional[str] = None
    rental_rate: Optional[int] = None
    minimum_rental: Optional[int] = None

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    venue_id: UUID  # CHANGED TO UUID
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True