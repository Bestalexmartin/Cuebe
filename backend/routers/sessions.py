"""
Blok 017 (Cuebe hybrid): session management router.

Admin+ endpoints to view and revoke user sessions, plus user self-service
endpoints for the caller's own sessions. Single-tenant, no org scoping.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import get_current_user
from models.enums import AccessRole
from models.user import User
from models.auth import UserSession
from schemas.auth import (
    MessageResponse,
    MySessionsResponse,
    SessionItem,
    SessionsOverview,
    UserSessionGroup,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

ONLINE_THRESHOLD_MINUTES = 20
ADMIN_ROLES = (AccessRole.SUPER_ADMIN, AccessRole.ADMIN)


def _require_admin(current_user: User):
    if current_user.access_role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.get("", response_model=SessionsOverview)
def list_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List active sessions grouped by user. Admin+ access."""
    _require_admin(current_user)

    now = datetime.now(timezone.utc)
    online_cutoff = now - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)

    rows = (
        db.query(UserSession, User)
        .join(User, UserSession.user_id == User.user_id)
        .filter(UserSession.is_revoked.is_(False), UserSession.expires_at > now)
        .order_by(UserSession.last_used_at.desc())
        .all()
    )

    groups: dict[UUID, dict] = {}
    for session, user in rows:
        uid = user.user_id
        if uid not in groups:
            groups[uid] = {
                "user_id": uid,
                "email": user.email_address,
                "display_name": f"{user.fullname_first} {user.fullname_last}".strip(),
                "sessions": [],
                "last_active_at": session.last_used_at,
            }
        groups[uid]["sessions"].append(
            SessionItem(
                id=session.id,
                device_info=session.device_info,
                ip_address=session.ip_address,
                created_at=session.created_at,
                last_used_at=session.last_used_at,
            )
        )
        if session.last_used_at > groups[uid]["last_active_at"]:
            groups[uid]["last_active_at"] = session.last_used_at

    user_list = []
    online_count = 0
    total_sessions = 0
    for group in groups.values():
        is_online = group["last_active_at"] >= online_cutoff
        if is_online:
            online_count += 1
        total_sessions += len(group["sessions"])
        user_list.append(
            UserSessionGroup(
                user_id=group["user_id"],
                email=group["email"],
                display_name=group["display_name"],
                is_online=is_online,
                last_active_at=group["last_active_at"],
                sessions=group["sessions"],
            )
        )

    user_list.sort(key=lambda u: (not u.is_online,))

    return SessionsOverview(
        online_now=online_count,
        logged_in=len(groups),
        total_sessions=total_sessions,
        users=user_list,
    )


@router.delete("/{session_id}", response_model=MessageResponse)
def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a single session. Admin+ access."""
    _require_admin(current_user)

    session = (
        db.query(UserSession)
        .filter(UserSession.id == session_id, UserSession.is_revoked.is_(False))
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.is_revoked = True
    session.revoked_reason = "admin_revoked"
    db.commit()
    return MessageResponse(message="Session revoked")


@router.delete("/user/{user_id}", response_model=MessageResponse)
def revoke_user_sessions(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke all active sessions for a user. Admin+ access."""
    _require_admin(current_user)

    now = datetime.now(timezone.utc)
    count = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == user_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now,
        )
        .update({"is_revoked": True, "revoked_reason": "admin_revoked"})
    )
    db.commit()
    return MessageResponse(message=f"Revoked {count} session(s)")


@router.get("/me", response_model=MySessionsResponse)
def my_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the caller's own active sessions."""
    now = datetime.now(timezone.utc)
    sessions = (
        db.query(UserSession)
        .filter(
            UserSession.user_id == current_user.user_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now,
        )
        .order_by(UserSession.last_used_at.desc())
        .all()
    )
    return MySessionsResponse(
        sessions=[
            SessionItem(
                id=s.id,
                device_info=s.device_info,
                ip_address=s.ip_address,
                created_at=s.created_at,
                last_used_at=s.last_used_at,
            )
            for s in sessions
        ]
    )


@router.delete("/me/{session_id}", response_model=MessageResponse)
def revoke_my_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke one of the caller's own sessions."""
    session = (
        db.query(UserSession)
        .filter(
            UserSession.id == session_id,
            UserSession.user_id == current_user.user_id,
            UserSession.is_revoked.is_(False),
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    session.is_revoked = True
    session.revoked_reason = "user_revoked"
    db.commit()
    return MessageResponse(message="Session revoked")
