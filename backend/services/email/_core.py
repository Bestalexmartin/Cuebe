"""
Email core, shared plumbing for all transactional emails.

Provides the branded HTML wrapper, the Resend send helper,
rate-limiting, and brand color constants.
"""

import logging
from datetime import datetime, timezone
from html import escape

import resend

from config import settings

logger = logging.getLogger(__name__)

BRAND_COLORS = {
    "gold": "#E5A833",
    "dark": "#1A202C",
    "gray": "#718096",
    "light_gray": "#A0AEC0",
    "bg_light": "#F7FAFC",
    "border": "#E2E8F0",
    "blue": "#3182CE",
}


# ---------------------------------------------------------------------------
# Template wrapper
# ---------------------------------------------------------------------------

def _email_wrapper(content: str, preheader: str = "") -> str:
    """Wrap email content in branded HTML shell (logo, card, footer).

    The header logo is read from settings.email_logo_url when set (point at
    a public bucket URL in production) and falls back to
    {website_url}/logo-email.png for local preview; recipients' mail clients
    can't reach localhost, so the fallback is preview-only.
    """
    website_url = settings.website_url or "http://localhost:5173"
    logo_url = settings.email_logo_url or f"{website_url}/logo-email.png"
    year = datetime.now(timezone.utc).year

    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Cuebe</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: {BRAND_COLORS['bg_light']}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <!-- Preheader -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        {escape(preheader)}
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: {BRAND_COLORS['bg_light']};">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 0 0 30px 0; text-align: center;">
                            <a href="{website_url}" style="text-decoration: none;">
                                <img src="{logo_url}"
                                     alt="Cuebe"
                                     width="200"
                                     style="display: block; margin: 0 auto; max-width: 200px;"
                                />
                            </a>
                        </td>
                    </tr>

                    <!-- Main content card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                            {content}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 0 0 0; text-align: center;">
                            <p style="margin: 0 0 10px 0; font-size: 13px; color: {BRAND_COLORS['light_gray']};">
                                &copy; {year} Cuebe. All rights reserved.
                            </p>
                            <p style="margin: 0; font-size: 13px; color: {BRAND_COLORS['light_gray']};">
                                <a href="{website_url}" style="color: {BRAND_COLORS['gray']}; text-decoration: none;">{website_url}</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Send helper
# ---------------------------------------------------------------------------

def _send_email(to: str, subject: str, html: str, plain: str, **kwargs) -> bool:
    """Send via Resend. Returns True on success, False on failure or unconfigured."""
    if not settings.resend_api_key:
        logger.info("Email not sent: RESEND_API_KEY not configured")
        return False

    resend.api_key = settings.resend_api_key

    try:
        payload = {
            "from": f"{settings.email_from_name} <{settings.email_from_address}>",
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html,
            "text": plain,
        }
        payload.update(kwargs)
        resend.Emails.send(payload)
        return True
    except Exception as e:
        logger.error(f"Failed to send email '{subject}': {e}")
        return False


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def _check_email_rate_limit(key: str, limit: int, window_seconds: int) -> bool:
    """
    Check rate limit via Redis. Returns True if allowed.

    Fails open (allows) if Redis is unavailable.
    """
    try:
        from services.redis_service import get_redis
        allowed, current, remaining = get_redis().check_rate_limit(key, limit, window_seconds)
        if not allowed:
            logger.warning(f"Email rate limit exceeded: {key} ({current}/{limit} per {window_seconds}s)")
        return allowed
    except Exception:
        return True  # Fail open
