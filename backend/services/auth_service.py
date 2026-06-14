"""
Blok 017 (Cuebe hybrid): authentication service.

Password hashing (bcrypt), HS256 JWT issue/verify with key rotation,
refresh-token hashing, TOTP MFA (pyotp), and token generators.

Cuebe runs synchronous SQLAlchemy and routers, so these helpers are sync.
Config is read from the `settings` singleton (Cuebe convention).
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
import pyotp

from config import settings
from models.enums import AccessRole

logger = logging.getLogger(__name__)


# ---------- Password Hashing ----------

def hash_password(password: str) -> str:
    """Hash a password using bcrypt with configurable rounds."""
    salt = bcrypt.gensalt(rounds=settings.auth_bcrypt_rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a bcrypt hash (timing-safe)."""
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ---------- JWT Tokens ----------

def _get_signing_key() -> str:
    """First key from the rotation list, or the single key fallback."""
    if settings.jwt_secret_keys:
        keys = [k.strip() for k in settings.jwt_secret_keys.split(",") if k.strip()]
        if keys:
            return keys[0]
    return settings.jwt_secret_key


def _get_validation_keys() -> list[str]:
    """All keys to try during validation (supports rotation)."""
    if settings.jwt_secret_keys:
        keys = [k.strip() for k in settings.jwt_secret_keys.split(",") if k.strip()]
        if keys:
            return keys
    return [settings.jwt_secret_key]


def create_access_token(
    user_id: str,
    org_id: Optional[str] = None,
    role: str = AccessRole.USER.value,
    session_user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> str:
    """Create a short-lived HS256 access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
    }
    if session_user_id:
        payload["session_user_id"] = session_user_id
    if session_id:
        payload["session_id"] = session_id
    return jwt.encode(payload, _get_signing_key(), algorithm="HS256")


def create_mfa_session_token(user_id: str) -> str:
    """Create a short-lived token for the MFA pending state (5 minutes)."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "mfa_pending",
        "iat": now,
        "exp": now + timedelta(minutes=5),
    }
    return jwt.encode(payload, _get_signing_key(), algorithm="HS256")


def decode_token(token: str, expected_type: str = "access") -> dict:
    """
    Decode and verify an HS256 JWT, trying every validation key (rotation).

    Raises jwt.InvalidTokenError on failure or token-type mismatch.
    """
    last_error: Optional[Exception] = None
    for key in _get_validation_keys():
        try:
            payload = jwt.decode(token, key, algorithms=["HS256"])
            if payload.get("type") != expected_type:
                raise jwt.InvalidTokenError(
                    f"Expected token type '{expected_type}', got '{payload.get('type')}'"
                )
            return payload
        except jwt.InvalidTokenError as exc:
            last_error = exc
            continue
    raise last_error or jwt.InvalidTokenError("Token validation failed")


# ---------- Refresh Tokens ----------

def generate_refresh_token() -> str:
    """Generate a cryptographically secure refresh token."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """Hash a token using SHA-256 for database storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ---------- Email / Reset Tokens ----------

def generate_verification_token() -> str:
    """Generate a secure token for email verification or password reset."""
    return secrets.token_urlsafe(32)


# ---------- TOTP MFA ----------

def generate_totp_secret() -> str:
    """Generate a new TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    """Generate an otpauth:// URI for QR code scanning."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=settings.auth_mfa_issuer_name)


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code against a secret (allows 1 period of clock drift)."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def encrypt_totp_secret(secret: str) -> str:
    """Encrypt a TOTP secret for database storage using Fernet."""
    if not settings.totp_encryption_key:
        if settings.app_env.lower() in {"development", "test"}:
            return f"plain:{secret}"
        raise RuntimeError(
            "TOTP_ENCRYPTION_KEY is required outside development/test environments"
        )
    from cryptography.fernet import Fernet

    f = Fernet(settings.totp_encryption_key.encode("utf-8"))
    return f.encrypt(secret.encode("utf-8")).decode("utf-8")


def decrypt_totp_secret(encrypted: str) -> str:
    """Decrypt a TOTP secret from database storage."""
    if encrypted.startswith("plain:"):
        if settings.app_env.lower() in {"development", "test"}:
            return encrypted[6:]
        raise RuntimeError(
            "Plaintext TOTP secret detected outside development/test environments"
        )
    from cryptography.fernet import Fernet

    f = Fernet(settings.totp_encryption_key.encode("utf-8"))
    return f.decrypt(encrypted.encode("utf-8")).decode("utf-8")


# ---------- Backup Codes ----------

def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate single-use backup codes for MFA recovery."""
    return [secrets.token_hex(4) for _ in range(count)]


def hash_backup_codes(codes: list[str]) -> list[str]:
    """Hash backup codes for storage."""
    return [hash_token(code) for code in codes]
