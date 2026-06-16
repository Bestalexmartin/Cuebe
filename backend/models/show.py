# backend/models/show.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base


class Show(Base):
    """Theater production/show"""
    __tablename__ = "showsTable"

    show_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core show information
    show_name = Column(String, index=True, nullable=False)
    show_date = Column(DateTime(timezone=True), nullable=True)
    show_end = Column(DateTime(timezone=True), nullable=True)  # End time of show
    show_notes = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)

    venue_id = Column(UUID(as_uuid=True), ForeignKey("venuesTable.venue_id"), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)

    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    show_owner = relationship("User", back_populates="shows", foreign_keys=[owner_id])
    venue = relationship("Venue", back_populates="shows")
    scripts = relationship("Script", back_populates="show", cascade="all, delete-orphan")
    crew = relationship("CrewAssignment", back_populates="show", cascade="all, delete-orphan")

class CrewAssignment(Base):
    """Assignment of crew members to shows with specific departments and roles"""
    __tablename__ = "crewAssignmentsTable"
    __table_args__ = (
        UniqueConstraint('show_id', 'user_id', 'department_id', name='unique_user_show_dept'),
    )

    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    show_id = Column(UUID(as_uuid=True), ForeignKey("showsTable.show_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.department_id"), nullable=False)

    # Show-specific role (may differ from user's general role)
    show_role = Column(String, nullable=True)  # e.g., "Head of Sound", "Assistant LD"

    # Sharing functionality
    share_token = Column(String(255), unique=True, nullable=True, index=True)  # Legacy plaintext token
    share_token_hash = Column(String(64), unique=True, nullable=True, index=True)
    share_token_hint = Column(String(12), nullable=True)
    share_expires_at = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(Integer, default=0, nullable=False)  # Track usage
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)  # Last access time

    # Assignment status and timestamps
    is_active = Column(Boolean, default=True, nullable=False)
    date_assigned = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="crew_assignments")
    department = relationship("Department")
    show = relationship("Show", back_populates="crew")

    @property
    def share_link_id(self):
        if self.share_token_hint:
            return self.share_token_hint
        if self.share_token:
            return self.share_token[-12:]
        return None
