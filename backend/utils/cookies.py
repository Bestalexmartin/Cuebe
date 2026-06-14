"""
Blok 017 (Cuebe hybrid): cookie helpers for HttpOnly token storage.

Sets and clears the auth cookie trio (bk_access, bk_refresh, bk_csrf) on
FastAPI Response objects. Reads tuning from the `settings` singleton.
"""

from fastapi import Response

from config import settings


ACCESS_COOKIE = "bk_access"
REFRESH_COOKIE = "bk_refresh"
CSRF_COOKIE = "bk_csrf"


def _is_secure() -> bool:
    """Secure flag is on unless running in development/test."""
    return settings.app_env not in ("development", "test")


def _cookie_kwargs() -> dict:
    """Common cookie keyword args derived from settings."""
    kwargs: dict = {
        "secure": _is_secure(),
        "samesite": settings.cookie_samesite,
    }
    if settings.cookie_domain:
        kwargs["domain"] = settings.cookie_domain
    return kwargs


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    """Set all three auth cookies on a response."""
    common = _cookie_kwargs()

    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        path="/",
        **common,
    )

    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/auth",
        **common,
    )

    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf_token,
        httponly=False,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/",
        **common,
    )


def set_access_cookie(response: Response, access_token: str) -> None:
    """Set just the access cookie."""
    common = _cookie_kwargs()
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        httponly=True,
        max_age=settings.jwt_access_token_expire_minutes * 60,
        path="/",
        **common,
    )


def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    """Set just the CSRF cookie."""
    common = _cookie_kwargs()
    response.set_cookie(
        key=CSRF_COOKIE,
        value=csrf_token,
        httponly=False,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/",
        **common,
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear all auth cookies."""
    common = _cookie_kwargs()
    response.delete_cookie(key=ACCESS_COOKIE, path="/", **common)
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/auth", **common)
    response.delete_cookie(key=CSRF_COOKIE, path="/", **common)
