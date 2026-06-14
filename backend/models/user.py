# backend/models/user.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Boolean, Text, UniqueConstraint, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base
from .enums import UserStatus, AccessRole


# Null-object organization id. Single-tenant Cuebe assigns every user this
# fixed UUID so Blok-style org-scoped hooks remain dormant but present.
INDIVIDUAL_ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")


class User(Base):
    """Unified user model supporting both guest and verified users"""
    __tablename__ = "userTable"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Legacy Clerk identifier. Retained for historical data only; Clerk has been
    # removed (Blok 017 self-hosted auth). Not written by current auth flows.
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
    user_role = Column(String, default="admin")  # legacy: admin for verified users, crew for guests

    # Blok 017 auth (Layer 1: access tier). Kept alongside legacy columns during transition.
    access_role = Column(Enum(AccessRole), default=AccessRole.USER, nullable=False)
    org_id = Column(UUID(as_uuid=True), default=INDIVIDUAL_ORG_ID, nullable=False)
    password_hash = Column(String(255), nullable=True)  # bcrypt; nullable until users set a password
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)

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

    # Blok 017 auth relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    mfa = relationship("UserMfa", back_populates="user", uselist=False, cascade="all, delete-orphan")

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
