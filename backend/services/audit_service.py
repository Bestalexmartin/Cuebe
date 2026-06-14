"""
Blok 017 (Cuebe hybrid): auth event audit service.

Logs authentication events to the authAuditLogTable and monitors event
rates via Redis counters, emitting structured warnings on threshold breach.
Synchronous to match Cuebe's SQLAlchemy session model.
"""

import logging
import time
from typing import Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session

from models.auth import AuthAuditLog

logger = logging.getLogger(__name__)

# Monitoring thresholds: max events per hour before alerting
MONITOR_THRESHOLDS: dict[str, int] = {
    "login_failure": 50,
    "account_locked": 10,
    "mfa_failure": 20,
    "password_reset_requested": 20,
    "registration": 50,
}

# Events that always emit a warning log (regardless of threshold)
ALWAYS_LOG_EVENTS = {"super_admin_login", "impersonation_start"}


def log_auth_event(
    db: Session,
    event_type: str,
    success: bool,
    request: Optional[Request] = None,
    user_id: Optional[UUID] = None,
    actor_id: Optional[UUID] = None,
    org_id: Optional[UUID] = None,
    details: Optional[dict] = None,
) -> AuthAuditLog:
    """
    Record an auth event in the audit log and check monitoring thresholds.

    The record is added to the session but NOT committed; it rides the
    caller's transaction.
    """
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent", "")[:500] or None

    record = AuthAuditLog(
        event_type=event_type,
        success=success,
        user_id=user_id,
        actor_id=actor_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
        org_id=org_id,
    )
    db.add(record)

    if event_type in ALWAYS_LOG_EVENTS:
        logger.warning(
            "AUTH_EVENT %s user_id=%s actor_id=%s ip=%s",
            event_type,
            user_id,
            actor_id,
            ip_address,
        )

    _check_threshold(event_type)
    return record


def _check_threshold(event_type: str) -> None:
    """Increment a Redis hourly counter and fire a critical log on first breach."""
    threshold = MONITOR_THRESHOLDS.get(event_type)
    if threshold is None:
        return

    try:
        from services.redis_service import get_redis

        redis_svc = get_redis()
        window = int(time.time()) // 3600
        key = f"audit:monitor:{event_type}:{window}"

        pipe = redis_svc.client.pipeline()
        pipe.incr(key)
        pipe.expire(key, 3601)
        results = pipe.execute()

        count = results[0]
        if count == threshold + 1:
            logger.critical(
                "THRESHOLD_BREACH %s count=%d threshold=%d window=%d",
                event_type,
                count,
                threshold,
                window,
            )
    except Exception:
        # Redis failure is non-fatal; fail open.
        pass
