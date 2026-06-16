from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import settings
from models.show import CrewAssignment
from services.auth_service import hash_token


def generate_share_token(length: int = 32) -> str:
    """Generate a secure random token for sharing."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def build_share_url(raw_token: str) -> str:
    return f"/shared/{raw_token}"


def get_share_link_id(assignment: CrewAssignment) -> Optional[str]:
    if assignment.share_token_hint:
        return assignment.share_token_hint
    if assignment.share_token:
        return assignment.share_token[-12:]
    return None


def get_share_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.share_token_ttl_days)


def is_share_active(assignment: CrewAssignment) -> bool:
    if not assignment.is_active:
        return False
    if assignment.share_expires_at is None:
        return True
    return assignment.share_expires_at > datetime.now(timezone.utc)


def issue_share_token(assignment: CrewAssignment) -> tuple[str, datetime]:
    raw_token = generate_share_token()
    assignment.share_token = None
    assignment.share_token_hash = hash_token(raw_token)
    assignment.share_token_hint = raw_token[-12:]
    assignment.share_expires_at = get_share_expiry()
    return raw_token, assignment.share_expires_at


def returnable_share_token(assignment: CrewAssignment) -> Optional[str]:
    """Return the legacy plaintext token only while older links are still being migrated out."""
    if assignment.share_token and is_share_active(assignment):
        return assignment.share_token
    return None


def find_assignment_by_share_token(db: Session, raw_token: str) -> Optional[CrewAssignment]:
    token_hash = hash_token(raw_token)
    assignment = (
        db.query(CrewAssignment)
        .filter(
            CrewAssignment.is_active.is_(True),
            or_(
                CrewAssignment.share_token_hash == token_hash,
                CrewAssignment.share_token == raw_token,
            ),
        )
        .first()
    )

    if assignment and is_share_active(assignment):
        return assignment

    return None
