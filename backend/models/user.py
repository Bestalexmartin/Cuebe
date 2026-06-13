# backend/models/user.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Boolean, Text, UniqueConstraint, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base
from .enums import UserStatus


class User(Base):
    """Unified user model supporting both guest and verified users"""
    __tablename__ = "userTable"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Clerk integration (nullable for guest users)
    clerk_user_id = Column(String, unique=True, nullable=True, index=True)

    # Core user information
    email_address = Column(String, unique=True, nullable=False, index=True)
    fullname_first = Column(String, nullable=False)
    fullname_last = Column(String, nullable=False)

    # Optional fields
    user_name = Column(String, unique=True, nullable=True, index=True)
    profile_img_url = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    # User status and role
    user_status = Column(Enum(UserStatus), default=UserStatus.VERIFIED, nullable=False)
    user_role = Column(String, default="admin")  # admin for verified users, crew for guests

    # Guest user management - CHANGED TO UUID
    created_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)  # Who created this guest user
    invited_at = Column(DateTime(timezone=True), nullable=True)  # When invitation was sent
    invitation_token = Column(String, unique=True, nullable=True)  # For invitation links

    # Internal notes (for guest users)
    notes = Column(Text, nullable=True)

    # User preferences and options
    user_prefs_json = Column(JSON, nullable=True)  # For complex preferences
    user_prefs_bitmap = Column(Integer, nullable=True, default=6)  # bitmap for boolean preferences

    # Status and timestamps
    is_active = Column(Boolean, default=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    shows = relationship("Show", back_populates="show_owner")
    crew_assignments = relationship("CrewAssignment", back_populates="user")

    # Guest user management relationships
    created_users = relationship("User", remote_side=[user_id], backref="creator")

    # Crew relationship management
    managed_crew = relationship("CrewRelationship", foreign_keys="CrewRelationship.manager_user_id", back_populates="manager")
    managed_by = relationship("CrewRelationship", foreign_keys="CrewRelationship.crew_user_id", back_populates="crew_member")

class CrewRelationship(Base):
    """Many-to-many relationship for crew management"""
    __tablename__ = "crewRelationshipsTable"
    __table_args__ = (
        UniqueConstraint('manager_user_id', 'crew_user_id', name='unique_manager_crew'),
    )

    relationship_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    manager_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)  # The verified user who manages
    crew_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)     # The user being managed

    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    manager = relationship("User", foreign_keys=[manager_user_id], back_populates="managed_crew")
    crew_member = relationship("User", foreign_keys=[crew_user_id], back_populates="managed_by")
