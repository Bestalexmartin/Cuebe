"""
Email templates, authentication emails (Blok 017).

Verification, password reset, email change, account deletion, org invite.
"""

from html import escape

from config import settings
from services.email._core import BRAND_COLORS, _email_wrapper, _send_email


# ---------------------------------------------------------------------------
# Content builders
# ---------------------------------------------------------------------------

def _verification_content(display_name: str, verify_url: str) -> str:
    first = escape(display_name.split()[0]) if display_name else "there"
    return f"""\
<!-- Gold accent bar -->
<div style="background-color: {BRAND_COLORS['gold']}; height: 4px; border-radius: 8px 8px 0 0;"></div>

<div style="padding: 30px;">
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: {BRAND_COLORS['dark']};">
        Verify your email
    </h1>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        Hi {first}, thanks for signing up! Please confirm your email address to get started.
    </p>

    <div style="margin: 25px 0; text-align: center;">
        <a href="{escape(verify_url)}"
           style="display: inline-block; padding: 12px 30px; background-color: {BRAND_COLORS['blue']}; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
            Verify Email
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['gray']}; line-height: 1.6;">
        This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
</div>"""


def _password_reset_content(display_name: str, reset_url: str) -> str:
    first = escape(display_name.split()[0]) if display_name else "there"
    return f"""\
<!-- Gold accent bar -->
<div style="background-color: {BRAND_COLORS['gold']}; height: 4px; border-radius: 8px 8px 0 0;"></div>

<div style="padding: 30px;">
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: {BRAND_COLORS['dark']};">
        Reset your password
    </h1>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        Hi {first}, we received a request to reset your password. Click the button below to choose a new one.
    </p>

    <div style="margin: 25px 0; text-align: center;">
        <a href="{escape(reset_url)}"
           style="display: inline-block; padding: 12px 30px; background-color: {BRAND_COLORS['blue']}; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
            Reset Password
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['gray']}; line-height: 1.6;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
</div>"""


def _email_change_content(display_name: str, verify_url: str) -> str:
    first = escape(display_name.split()[0]) if display_name else "there"
    return f"""\
<!-- Gold accent bar -->
<div style="background-color: {BRAND_COLORS['gold']}; height: 4px; border-radius: 8px 8px 0 0;"></div>

<div style="padding: 30px;">
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: {BRAND_COLORS['dark']};">
        Confirm email change
    </h1>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        Hi {first}, please confirm this new email address for your Cuebe account.
    </p>

    <div style="margin: 25px 0; text-align: center;">
        <a href="{escape(verify_url)}"
           style="display: inline-block; padding: 12px 30px; background-color: {BRAND_COLORS['blue']}; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
            Confirm Email
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['gray']}; line-height: 1.6;">
        This link expires in 24 hours. If you didn't request this change, you can safely ignore this email.
    </p>
</div>"""


def _account_deletion_content(display_name: str) -> str:
    first = escape(display_name.split()[0]) if display_name else "there"
    return f"""\
<!-- Gold accent bar -->
<div style="background-color: {BRAND_COLORS['gold']}; height: 4px; border-radius: 8px 8px 0 0;"></div>

<div style="padding: 30px;">
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: {BRAND_COLORS['dark']};">
        Account deletion scheduled
    </h1>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        Hi {first}, your Cuebe account has been deactivated and is scheduled for permanent deletion in 30 days.
    </p>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        If you change your mind, simply sign in within the next 30 days to reactivate your account.
    </p>

    <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['gray']}; line-height: 1.6;">
        If you didn't request this, please contact support immediately.
    </p>
</div>"""


def _org_invite_content(org_name: str, invite_url: str) -> str:
    return f"""\
<!-- Gold accent bar -->
<div style="background-color: {BRAND_COLORS['gold']}; height: 4px; border-radius: 8px 8px 0 0;"></div>

<div style="padding: 30px;">
    <h1 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: {BRAND_COLORS['dark']};">
        You've been invited
    </h1>

    <p style="margin: 0 0 15px 0; font-size: 15px; color: {BRAND_COLORS['dark']}; line-height: 1.6;">
        You've been invited to join <strong>{escape(org_name)}</strong> on Cuebe.
    </p>

    <div style="margin: 25px 0; text-align: center;">
        <a href="{escape(invite_url)}"
           style="display: inline-block; padding: 12px 30px; background-color: {BRAND_COLORS['blue']}; color: #ffffff; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px;">
            Accept Invitation
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['gray']}; line-height: 1.6;">
        This invitation expires in 72 hours.
    </p>
</div>"""


# ---------------------------------------------------------------------------
# Public send functions
# ---------------------------------------------------------------------------

def send_verification_email(email: str, display_name: str, token: str) -> bool:
    """Send branded email-verification message via Resend."""
    verify_url = f"{settings.website_url}/verify-email?token={token}"
    content = _verification_content(display_name, verify_url)
    html = _email_wrapper(content, "Please verify your email address")

    first = display_name.split()[0] if display_name else "there"
    plain = (
        f"Hi {first},\n\n"
        f"Please verify your email by visiting:\n{verify_url}\n\n"
        "This link expires in 24 hours.\n\n"
        "If you didn't create an account, you can safely ignore this email."
    )

    return _send_email(email, "Verify your email", html, plain)


def send_password_reset_email(email: str, display_name: str, token: str) -> bool:
    """Send branded password-reset message via Resend."""
    reset_url = f"{settings.website_url}/reset-password?token={token}"
    content = _password_reset_content(display_name, reset_url)
    html = _email_wrapper(content, "Reset your password")

    first = display_name.split()[0] if display_name else "there"
    plain = (
        f"Hi {first},\n\n"
        f"Reset your password by visiting:\n{reset_url}\n\n"
        "This link expires in 1 hour.\n\n"
        "If you didn't request a password reset, you can safely ignore this email."
    )

    return _send_email(email, "Reset your password", html, plain)


def send_email_change_verification(email: str, display_name: str, token: str) -> bool:
    """Send email change verification message via Resend."""
    verify_url = f"{settings.website_url}/verify-email-change?token={token}"
    content = _email_change_content(display_name, verify_url)
    html = _email_wrapper(content, "Confirm your new email address")

    first = display_name.split()[0] if display_name else "there"
    plain = (
        f"Hi {first},\n\n"
        f"Confirm your new email address by visiting:\n{verify_url}\n\n"
        "This link expires in 24 hours.\n\n"
        "If you didn't request this change, you can safely ignore this email."
    )

    return _send_email(email, "Confirm email change", html, plain)


def send_account_deletion_email(email: str, display_name: str) -> bool:
    """Send account deletion confirmation message via Resend."""
    content = _account_deletion_content(display_name)
    html = _email_wrapper(content, "Your account deletion has been scheduled")

    first = display_name.split()[0] if display_name else "there"
    plain = (
        f"Hi {first},\n\n"
        "Your Cuebe account has been deactivated and is scheduled for permanent deletion in 30 days.\n\n"
        "If you change your mind, simply sign in within the next 30 days to reactivate your account.\n\n"
        "If you didn't request this, please contact support immediately."
    )

    return _send_email(email, "Account deletion scheduled", html, plain)


def send_org_invite_email(email: str, org_name: str, invite_token: str) -> bool:
    """Send organization invitation email via Resend."""
    invite_url = f"{settings.website_url}/sign-up?invite={invite_token}"
    content = _org_invite_content(org_name, invite_url)
    html = _email_wrapper(content, f"You've been invited to {org_name}")

    plain = (
        f"You've been invited to join {org_name} on Cuebe.\n\n"
        f"Accept the invitation by visiting:\n{invite_url}\n\n"
        "This invitation expires in 72 hours."
    )

    return _send_email(email, f"You've been invited to {org_name}", html, plain)
