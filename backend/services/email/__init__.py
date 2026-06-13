"""Email service, branded transactional emails via Resend (Blok 012)."""

from services.email._core import BRAND_COLORS, _email_wrapper
from services.email._auth import (
    send_account_deletion_email,
    send_email_change_verification,
    send_org_invite_email,
    send_password_reset_email,
    send_verification_email,
)

__all__ = [
    "BRAND_COLORS",
    "_email_wrapper",
    "send_account_deletion_email",
    "send_email_change_verification",
    "send_org_invite_email",
    "send_password_reset_email",
    "send_verification_email",
]
