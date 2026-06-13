# backend/models/department.py

from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base


class Department(Base):
    """Theater departments (Sound, Lighting, etc.)"""
    __tablename__ = "departmentsTable"

    department_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    department_name = Column(String, nullable=False)
    department_description = Column(String, nullable=True)
    department_color = Column(String, nullable=True)  # e.g., "#FF5733"
    department_initials = Column(String(5), nullable=True)  # e.g., "LX", "SND"

    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)

    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
