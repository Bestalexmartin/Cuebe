"""
Blok 017 (Cuebe hybrid): JWT authentication middleware.

FastAPI dependencies for protecting routes:
- get_current_user: extracts and validates the JWT from the bk_access cookie
  first, then the Authorization: Bearer header; loads the User and enforces
  is_active plus the password-change invalidation check.
- require_role(*roles): access-tier (AccessRole) gate factory.

This is the Blok-style dependency. It is intentionally NOT yet wired into the
existing Clerk routers; that swap is a later card. New routers (auth, sessions,
audit) import from here.
"""

from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from models.enums import AccessRole
from models.user import User
from models.auth import UserSession
from services.auth_service import decode_token

ACCESS_COOKIE = "bk_access"


def _extract_token(request: Request) -> Optional[str]:
    """Extract the JWT from the bk_access cookie first, then a Bearer header."""
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        return token

    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    Validate the access token and return the active User.

    Rejects missing/expired/invalid tokens (401), deactivated accounts (403),
    and tokens issued before the user's last password change (401). Updates
    the bound session's last_used_at when stale.
    """
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token, expected_type="access")
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.user_id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.password_changed_at is not None:
        token_issued_at = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        if token_issued_at < user.password_changed_at.replace(microsecond=0):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalidated by password change",
                headers={"WWW-Authenticate": "Bearer"},
            )

    session_id = payload.get("session_id")
    if session_id:
        session = (
            db.query(UserSession)
            .filter(
                UserSession.id == session_id,
                UserSession.user_id == user.user_id,
                UserSession.is_revoked.is_(False),
            )
            .first()
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session revoked or expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        now = datetime.now(timezone.utc)
        if session.last_used_at is None or (now - session.last_used_at).total_seconds() > 300:
            session.last_used_at = now
            db.commit()

    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated User, or None when no valid token is present."""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


def require_role(*allowed_roles: AccessRole):
    """
    Access-tier gate factory.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role(AccessRole.SUPER_ADMIN))])
    """

    def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.access_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return check_role
