"""
Blok 017 (Cuebe hybrid): authentication Pydantic schemas.

Request/response models for the local-auth endpoints. Org and avatar shapes
from upstream Blok are intentionally omitted (single-tenant, no R2 avatars).
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from models.enums import AccessRole


# ---------- Login ----------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: AccessRole
    org_id: Optional[UUID] = None


class LoginResponse(BaseModel):
    user: Optional[LoginUserResponse] = None
    mfa_required: bool = False
    mfa_session_token: Optional[str] = None


# ---------- MFA Verify (login step) ----------

class MfaVerifyRequest(BaseModel):
    mfa_session_token: str
    code: str = Field(..., min_length=6, max_length=8)


# ---------- Refresh / Logout ----------

class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None  # Cookie takes precedence


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None  # Cookie takes precedence


class MessageResponse(BaseModel):
    message: str


# ---------- Me ----------

class UserMeResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    first_name: str
    last_name: str
    username: Optional[str] = None
    phone: Optional[str] = None
    role: AccessRole
    org_id: Optional[UUID] = None
    email_verified: bool
    mfa_enabled: bool
    user_status: str


# ---------- Registration ----------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)
    first_name: str = Field(default="", max_length=100)
    last_name: str = Field(default="", max_length=100)


# ---------- Email Verification ----------

class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ---------- Password Reset / Change ----------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=12, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=12, max_length=128)


# ---------- MFA Setup ----------

class MfaSetupResponse(BaseModel):
    secret: str
    qr_uri: str
    backup_codes: list[str]


class MfaVerifySetupRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class MfaDisableRequest(BaseModel):
    password: str


# ---------- Sessions ----------

class SessionItem(BaseModel):
    id: UUID
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    is_current: bool = False


class UserSessionGroup(BaseModel):
    user_id: UUID
    email: str
    display_name: str
    is_online: bool
    last_active_at: datetime
    sessions: list[SessionItem]


class SessionsOverview(BaseModel):
    online_now: int
    logged_in: int
    total_sessions: int
    users: list[UserSessionGroup]


class MySessionsResponse(BaseModel):
    sessions: list[SessionItem]


# ---------- Audit Log ----------

class AuditLogItem(BaseModel):
    id: UUID
    timestamp: datetime
    event_type: str
    success: bool
    user_id: Optional[UUID] = None
    actor_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    org_id: Optional[UUID] = None


class AuditLogResponse(BaseModel):
    items: list[AuditLogItem]
    total: int
    page: int
    page_size: int
