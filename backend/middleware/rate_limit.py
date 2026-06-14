"""
Blok 017 (Cuebe hybrid): per-identity rate limiting for auth endpoints.

Redis-backed fixed-window limiter built on services/redis_service. Uses an
atomic INCR + EXPIRE pipeline for distributed, restart-safe limiting. Fails
closed (503) when Redis is unavailable: every limited endpoint has its limit
for a security reason, so silently dropping it on infra failure is not safe.
"""

import hashlib
import logging
import time
from typing import Optional

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


class RateLimiter:
    """Redis-backed fixed-window rate limiter."""

    def __init__(self):
        self._redis = None

    @property
    def redis(self):
        if self._redis is None:
            from services.redis_service import get_redis

            self._redis = get_redis()
        return self._redis

    def check(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
        """Return (allowed, current_count, remaining) for the window bucket."""
        try:
            window_start = int(time.time()) // window_seconds
            redis_key = f"auth:ratelimit:{key}:{window_start}"

            pipe = self.redis.client.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, window_seconds + 1)
            results = pipe.execute()

            current = results[0]
            remaining = max(0, max_requests - current)
            allowed = current <= max_requests
            return allowed, current, remaining
        except Exception:
            logger.error("Redis unavailable for rate limiting, failing closed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Rate limiting service unavailable. Try again shortly.",
            )

    def clear(self):
        """Clear all rate limit data (for testing)."""
        try:
            keys = self.redis.client.keys("auth:ratelimit:*")
            if keys:
                self.redis.client.delete(*keys)
        except Exception:
            logger.warning("Redis unavailable, could not clear rate limit data")


_auth_rate_limiter = RateLimiter()


def get_auth_rate_limiter() -> RateLimiter:
    return _auth_rate_limiter


def rate_limit_key(request: Request, identity: Optional[str] = None) -> str:
    """Build a rate limit key from request IP and optional identity (email)."""
    client_ip = request.client.host if request.client else "unknown"
    if identity:
        return f"{client_ip}:{identity}"
    return client_ip


def check_login_rate_limit(request: Request, email: str):
    """Login: 5 attempts per minute per email:ip. Raises 429 if exceeded."""
    key = rate_limit_key(request, identity=email)
    allowed, _, _ = _auth_rate_limiter.check(
        key=f"login:{key}", max_requests=5, window_seconds=60
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again in a minute.",
            headers={"Retry-After": "60"},
        )


def check_register_rate_limit(request: Request):
    """Registration: 3 per hour per IP. Raises 429 if exceeded."""
    client_ip = request.client.host if request.client else "unknown"
    allowed, _, _ = _auth_rate_limiter.check(
        key=f"register:{client_ip}", max_requests=3, window_seconds=3600
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many registration attempts. Try again later.",
            headers={"Retry-After": "3600"},
        )


def check_mfa_rate_limit(mfa_session_token: str):
    """MFA verify: 5 attempts per MFA session token. Raises 429 if exceeded."""
    token_hash = hashlib.sha256(mfa_session_token.encode()).hexdigest()[:16]
    redis_key = f"auth:ratelimit:mfa_verify:{token_hash}"

    try:
        pipe = _auth_rate_limiter.redis.client.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, 300)
        results = pipe.execute()

        current = results[0]
        if current > 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many MFA attempts. Request a new login.",
                headers={"Retry-After": "300"},
            )
    except HTTPException:
        raise
    except Exception:
        logger.error("Redis unavailable for MFA rate limiting, failing closed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Rate limiting service unavailable. Try again shortly.",
        )


def check_verification_email_rate_limit(email: str):
    """Verification email: 1 per 5 minutes and 3 per 24 hours per email."""
    allowed, _, _ = _auth_rate_limiter.check(
        key=f"verify_email_cooldown:{email}", max_requests=1, window_seconds=300
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Verification email already sent. Try again in a few minutes.",
            headers={"Retry-After": "300"},
        )

    allowed, _, _ = _auth_rate_limiter.check(
        key=f"verify_email_daily:{email}", max_requests=3, window_seconds=86400
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification emails. Try again tomorrow.",
            headers={"Retry-After": "86400"},
        )


def check_forgot_password_rate_limit(email: str):
    """Forgot-password email: 1 per 5 minutes and 3 per 24 hours per email."""
    allowed, _, _ = _auth_rate_limiter.check(
        key=f"forgot_password_cooldown:{email}", max_requests=1, window_seconds=300
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Reset email already sent. Try again in a few minutes.",
            headers={"Retry-After": "300"},
        )

    allowed, _, _ = _auth_rate_limiter.check(
        key=f"forgot_password_daily:{email}", max_requests=3, window_seconds=86400
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reset requests. Try again tomorrow.",
            headers={"Retry-After": "86400"},
        )
