"""
Blok 017 (Cuebe hybrid): CSRF protection middleware (double-submit cookie).

Validates that the X-CSRF-Token header matches the bk_csrf cookie on any
state-changing request that carries the bk_access cookie. Bearer-token and
anonymous requests have no CSRF exposure and are skipped.
"""

import hmac

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from utils.cookies import ACCESS_COOKIE, CSRF_COOKIE

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Pre-auth endpoints that cannot carry a valid CSRF pair yet.
EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/verify-email",
    "/api/auth/verify-email-change",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/mfa/verify",
    "/api/auth/mfa/forced-setup",
    "/api/auth/mfa/forced-setup/verify",
    "/api/auth/resend-verification",
    "/health",
    "/api/health",
    "/",
}


def _normalize_path(path: str) -> str:
    """Strip trailing slash so `/api/auth/login/` matches `/api/auth/login`."""
    if path == "/":
        return path
    return path.rstrip("/") or "/"


class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in SAFE_METHODS:
            return await call_next(request)

        if _normalize_path(request.url.path) in EXEMPT_PATHS:
            return await call_next(request)

        # CSRF is required only when the request is cookie-authenticated.
        if not request.cookies.get(ACCESS_COOKIE):
            return await call_next(request)

        csrf_cookie = request.cookies.get(CSRF_COOKIE, "")
        csrf_header = request.headers.get("x-csrf-token", "")

        if not csrf_cookie or not csrf_header or not hmac.compare_digest(csrf_cookie, csrf_header):
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token missing or invalid"},
            )

        return await call_next(request)
