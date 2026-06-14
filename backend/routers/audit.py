"""
Blok 017 (Cuebe hybrid): audit log router.

Admin+ endpoint for browsing auth audit events. Single-tenant, no org scoping.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import get_current_user
from models.enums import AccessRole
from models.user import User
from models.auth import AuthAuditLog
from schemas.auth import AuditLogItem, AuditLogResponse

router = APIRouter(prefix="/api/audit-log", tags=["audit"])

ADMIN_ROLES = (AccessRole.SUPER_ADMIN, AccessRole.ADMIN)


def _require_admin(current_user: User):
    if current_user.access_role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


@router.get("", response_model=AuditLogResponse)
def list_audit_log(
    event_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    success: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List audit log entries with optional filters. Admin+ access."""
    _require_admin(current_user)

    query = db.query(AuthAuditLog)
    if event_type is not None:
        query = query.filter(AuthAuditLog.event_type == event_type)
    if user_id is not None:
        query = query.filter(AuthAuditLog.user_id == user_id)
    if success is not None:
        query = query.filter(AuthAuditLog.success == success)

    total = query.count()
    rows = (
        query.order_by(AuthAuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AuditLogItem(
            id=row.id,
            timestamp=row.timestamp,
            event_type=row.event_type,
            success=row.success,
            user_id=row.user_id,
            actor_id=row.actor_id,
            ip_address=row.ip_address,
            details=row.details,
            org_id=row.org_id,
        )
        for row in rows
    ]

    return AuditLogResponse(items=items, total=total, page=page, page_size=page_size)
