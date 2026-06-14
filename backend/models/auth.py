# backend/models/auth.py

"""
Blok 017 (Cuebe hybrid): self-hosted authentication models.

Provides the SQLAlchemy tables that back local accounts, sessions, MFA,
and the auth audit trail. The User model itself lives in models/user.py;
the access tier and credential columns are added there. These tables hang
off the existing userTable via user_id foreign keys.

Single-tenant: there is no Organization model. Org-scoping is a dormant
null-object (see INDIVIDUAL_ORG_ID in models/user.py).
"""

from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import relationship

from .base import Base


class UserSession(Base):
    """Refresh-token session with device info, family tracking, and revocation."""

    __tablename__ = "userSessionsTable"
    __table_args__ = (
        Index("idx_sessions_expiry", "expires_at", "is_revoked"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("userTable.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    family_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    refresh_token_hash = Column(String(255), nullable=False, unique=True, index=True)
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, nullable=False, default=False)
    revoked_reason = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sessions")


class UserMfa(Base):
    """TOTP MFA configuration: encrypted secret plus hashed backup codes."""

    __tablename__ = "userMfaTable"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("userTable.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    totp_secret_encrypted = Column(Text, nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=False)
    backup_codes = Column(JSONB, nullable=False, default=list)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="mfa")


class EmailVerificationToken(Base):
    """One-time email verification token (hashed at rest, 24-hour expiry)."""

    __tablename__ = "emailVerificationTokensTable"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("userTable.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class PasswordResetToken(Base):
    """One-time password reset token (hashed at rest)."""

    __tablename__ = "passwordResetTokensTable"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("userTable.user_id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))


class AuthAuditLog(Base):
    """Auth event audit trail. No FK to users so logs survive account deletion."""

    __tablename__ = "authAuditLogTable"
    __table_args__ = (
        Index("idx_audit_timestamp", "timestamp"),
        Index("idx_audit_event_type", "event_type"),
        Index("idx_audit_user_timestamp", "user_id", "timestamp"),
    )

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    user_id = Column(PG_UUID(as_uuid=True), nullable=True)
    actor_id = Column(PG_UUID(as_uuid=True), nullable=True)
    event_type = Column(String(50), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)
    org_id = Column(PG_UUID(as_uuid=True), nullable=True)
    success = Column(Boolean, nullable=False)
