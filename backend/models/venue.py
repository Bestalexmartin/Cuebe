# backend/models/venue.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base


class Venue(Base):
    """Theater venue information"""
    __tablename__ = "venuesTable"

    venue_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    venue_name = Column(String, nullable=False)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)

    # Location Information
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

    # Venue Details
    capacity = Column(Integer, nullable=True)
    venue_type = Column(String, nullable=True)  # e.g., "Proscenium", "Thrust", "Arena", "Black Box"

    # Contact Information
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)

    # Technical Specifications (in feet)
    stage_width = Column(Integer, nullable=True)
    stage_depth = Column(Integer, nullable=True)
    fly_height = Column(Integer, nullable=True)

    # Equipment and Features (stored as JSON array)
    equipment = Column(JSON, nullable=True)  # e.g., ["Fly System", "Orchestra Pit", "Sound System"]

    # Additional Information
    venue_notes = Column(Text, nullable=True)

    # Rental Information
    rental_rate = Column(Integer, nullable=True)  # Daily rate in dollars
    minimum_rental = Column(Integer, nullable=True)  # Minimum rental amount

    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    shows = relationship("Show", back_populates="venue")
