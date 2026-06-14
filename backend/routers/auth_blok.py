"""
Blok 017 (Cuebe hybrid): self-hosted auth endpoints.

Local email/password auth with HttpOnly cookies (bk_access / bk_refresh /
bk_csrf), email verification, password reset, password change, and TOTP MFA.
Single-tenant: every user gets org_id = INDIVIDUAL_ORG_ID and an AccessRole.

Mounted at /api/auth. This is the Blok-style router; the legacy Clerk router
(routers/auth.py) is unchanged and still backs the existing app routers. The
cutover is a later card.
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from config import settings
from database import get_db
from middleware.auth import get_current_user
from middleware.rate_limit import (
    check_forgot_password_rate_limit,
    check_login_rate_limit,
    check_mfa_rate_limit,
    check_register_rate_limit,
    check_verification_email_rate_limit,
)
from models.enums import AccessRole, UserStatus
from models.user import INDIVIDUAL_ORG_ID, User
from models.auth import (
    EmailVerificationToken,
    PasswordResetToken,
    UserMfa,
    UserSession,
)
from schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    LoginUserResponse,
    MessageResponse,
    MfaDisableRequest,
    MfaSetupResponse,
    MfaVerifyRequest,
    MfaVerifySetupRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    UserMeResponse,
    VerifyEmailRequest,
)
from services.audit_service import log_auth_event
from services.auth_service import (
    create_access_token,
    create_mfa_session_token,
    decode_token,
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_backup_codes,
    generate_refresh_token,
    generate_totp_secret,
    generate_verification_token,
    get_totp_uri,
    hash_backup_codes,
    hash_password,
    hash_token,
    verify_password,
    verify_totp,
)
from services.email import send_password_reset_email, send_verification_email
from utils.cookies import clear_auth_cookies, set_auth_cookies

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

VERIFICATION_TOKEN_TTL = timedelta(hours=24)
RESET_TOKEN_TTL = timedelta(hours=1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_email(email: str) -> str:
    """Canonicalize email for identity, lookup, and rate-limit keys."""
    return email.strip().lower()


def _display_name(user: User) -> str:
    return f"{user.fullname_first} {user.fullname_last}".strip() or user.email_address


def _find_user_by_email(db: Session, email: str) -> User | None:
    return (
        db.query(User)
        .filter(func.lower(User.email_address) == _normalize_email(email))
        .first()
    )


def _issue_session_tokens(user: User, request: Request, db: Session) -> tuple[str, str, str]:
    """Create access + refresh + CSRF tokens and persist a session row."""
    refresh_token = generate_refresh_token()
    csrf_token = secrets.token_hex(32)
    session_id = uuid4()

    access_token = create_access_token(
        user_id=str(user.user_id),
        org_id=str(user.org_id) if user.org_id else None,
        role=user.access_role.value,
        session_id=str(session_id),
    )

    session = UserSession(
        id=session_id,
        user_id=user.user_id,
        family_id=session_id,
        refresh_token_hash=hash_token(refresh_token),
        device_info=request.headers.get("User-Agent", "")[:500],
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(session)
    return access_token, refresh_token, csrf_token


def _login_success_response(user: User, request: Request, db: Session) -> JSONResponse:
    access_token, refresh_token, csrf_token = _issue_session_tokens(user, request, db)
    log_auth_event(db, "login_success", True, request, user_id=user.user_id, org_id=user.org_id)
    db.commit()

    body = LoginResponse(
        user=LoginUserResponse(
            id=user.user_id,
            email=user.email_address,
            display_name=_display_name(user),
            role=user.access_role,
            org_id=user.org_id,
        ),
        mfa_required=False,
    )
    response = JSONResponse(content=body.model_dump(mode="json"))
    set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return response


# ---------------------------------------------------------------------------
# Login + MFA verify
# ---------------------------------------------------------------------------

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = _normalize_email(payload.email)
    check_login_rate_limit(request, email)

    user = _find_user_by_email(db, email)

    # Timing-safe: always verify against something.
    stored_hash = user.password_hash if user and user.password_hash else ""
    password_ok = verify_password(payload.password, stored_hash)

    if not user or not password_ok:
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= settings.auth_lockout_threshold:
                user.locked_until = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.auth_lockout_duration_minutes
                )
                log_auth_event(db, "account_locked", True, request, user_id=user.user_id, org_id=user.org_id)
            log_auth_event(db, "login_failure", False, request, user_id=user.user_id, org_id=user.org_id)
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.locked_until and user.locked_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked until {user.locked_until.isoformat()}",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

    if not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    # Reset lockout counters on success.
    user.failed_login_attempts = 0
    user.locked_until = None

    mfa = db.query(UserMfa).filter(UserMfa.user_id == user.user_id).first()
    if mfa and mfa.is_enabled:
        db.commit()
        return LoginResponse(
            mfa_required=True,
            mfa_session_token=create_mfa_session_token(str(user.user_id)),
        )

    return _login_success_response(user, request, db)


@router.post("/mfa/verify", response_model=LoginResponse)
def mfa_verify(payload: MfaVerifyRequest, request: Request, db: Session = Depends(get_db)):
    check_mfa_rate_limit(payload.mfa_session_token)

    try:
        claims = decode_token(payload.mfa_session_token, expected_type="mfa_pending")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired MFA session")

    user = db.query(User).filter(User.user_id == claims["sub"]).first()
    mfa = db.query(UserMfa).filter(UserMfa.user_id == user.user_id).first() if user else None
    if not user or not mfa or not mfa.is_enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="MFA not configured")

    code = payload.code.strip()
    verified = verify_totp(decrypt_totp_secret(mfa.totp_secret_encrypted), code)

    if not verified:
        code_hash = hash_token(code)
        if code_hash in (mfa.backup_codes or []):
            remaining = [c for c in mfa.backup_codes if c != code_hash]
            mfa.backup_codes = remaining
            verified = True

    if not verified:
        log_auth_event(db, "mfa_failure", False, request, user_id=user.user_id, org_id=user.org_id)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")

    return _login_success_response(user, request, db)


# ---------------------------------------------------------------------------
# Refresh + logout
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=MessageResponse)
def refresh(request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get("bk_refresh")
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    token_hash = hash_token(raw)
    session = (
        db.query(UserSession)
        .filter(UserSession.refresh_token_hash == token_hash, UserSession.is_revoked.is_(False))
        .first()
    )

    if not session:
        # Reuse detection: a revoked token replays its whole family.
        revoked = db.query(UserSession).filter(UserSession.refresh_token_hash == token_hash).first()
        if revoked:
            db.query(UserSession).filter(
                UserSession.family_id == revoked.family_id,
                UserSession.is_revoked.is_(False),
            ).update({"is_revoked": True, "revoked_reason": "reuse_detected"})
            db.commit()
            logger.warning("Refresh token reuse detected: family_id=%s", revoked.family_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if session.expires_at <= datetime.now(timezone.utc):
        session.is_revoked = True
        session.revoked_reason = "expired"
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.query(User).filter(User.user_id == session.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Rotate: revoke the old session, issue a new one in the same family.
    new_refresh = generate_refresh_token()
    csrf_token = secrets.token_hex(32)
    new_session_id = uuid4()

    session.is_revoked = True
    session.revoked_reason = "rotation"

    new_session = UserSession(
        id=new_session_id,
        user_id=user.user_id,
        family_id=session.family_id,
        refresh_token_hash=hash_token(new_refresh),
        device_info=request.headers.get("User-Agent", "")[:500],
        ip_address=request.client.host if request.client else None,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(new_session)

    access_token = create_access_token(
        user_id=str(user.user_id),
        org_id=str(user.org_id) if user.org_id else None,
        role=user.access_role.value,
        session_id=str(new_session_id),
    )
    db.commit()

    response = JSONResponse(content={"message": "ok"})
    set_auth_cookies(response, access_token, new_refresh, csrf_token)
    return response


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get("bk_refresh")
    if raw:
        session = (
            db.query(UserSession)
            .filter(UserSession.refresh_token_hash == hash_token(raw), UserSession.is_revoked.is_(False))
            .first()
        )
        if session:
            session.is_revoked = True
            session.revoked_reason = "logout"
            db.commit()

    response = JSONResponse(content={"message": "ok"})
    clear_auth_cookies(response)
    return response


# ---------------------------------------------------------------------------
# Registration + email verification
# ---------------------------------------------------------------------------

@router.post("/register", response_model=MessageResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_register_rate_limit(request)
    email = _normalize_email(payload.email)

    if _find_user_by_email(db, email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    first = payload.first_name or (payload.display_name.split()[0] if payload.display_name else "")
    last = payload.last_name or (
        " ".join(payload.display_name.split()[1:]) if payload.display_name else ""
    )

    user = User(
        email_address=email,
        fullname_first=first or payload.display_name,
        fullname_last=last,
        password_hash=hash_password(payload.password),
        password_changed_at=datetime.now(timezone.utc),
        access_role=AccessRole.USER,
        org_id=INDIVIDUAL_ORG_ID,
        user_status=UserStatus.VERIFIED,
        user_role="admin",
        email_verified=False,
        is_active=True,
    )
    db.add(user)
    db.flush()

    raw_token = generate_verification_token()
    db.add(
        EmailVerificationToken(
            user_id=user.user_id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_TTL,
        )
    )
    log_auth_event(db, "registration", True, request, user_id=user.user_id, org_id=user.org_id)
    db.commit()

    send_verification_email(email, _display_name(user), raw_token)
    return MessageResponse(message="Registration successful. Please verify your email.")


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, request: Request, db: Session = Depends(get_db)):
    record = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == hash_token(payload.token))
        .first()
    )
    if not record or record.used_at is not None or record.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = db.query(User).filter(User.user_id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    user.email_verified = True
    record.used_at = datetime.now(timezone.utc)
    log_auth_event(db, "email_verified", True, request, user_id=user.user_id, org_id=user.org_id)
    db.commit()
    return MessageResponse(message="Email verified.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    payload: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)
):
    email = _normalize_email(payload.email)
    check_verification_email_rate_limit(email)

    user = _find_user_by_email(db, email)
    if user and not user.email_verified:
        raw_token = generate_verification_token()
        db.add(
            EmailVerificationToken(
                user_id=user.user_id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) + VERIFICATION_TOKEN_TTL,
            )
        )
        db.commit()
        send_verification_email(email, _display_name(user), raw_token)

    # Always 200 (timing-safe; do not reveal account existence).
    return MessageResponse(message="If an account exists, a verification email has been sent.")


# ---------------------------------------------------------------------------
# Password reset + change
# ---------------------------------------------------------------------------

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)
):
    email = _normalize_email(payload.email)
    check_forgot_password_rate_limit(email)

    user = _find_user_by_email(db, email)
    if user:
        # One active reset token per user: invalidate prior unused tokens.
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.user_id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.now(timezone.utc)})

        raw_token = generate_verification_token()
        db.add(
            PasswordResetToken(
                user_id=user.user_id,
                token_hash=hash_token(raw_token),
                expires_at=datetime.now(timezone.utc) + RESET_TOKEN_TTL,
            )
        )
        log_auth_event(db, "password_reset_requested", True, request, user_id=user.user_id, org_id=user.org_id)
        db.commit()
        send_password_reset_email(email, _display_name(user), raw_token)

    return MessageResponse(message="If an account exists, a reset email has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == hash_token(payload.token))
        .first()
    )
    if not record or record.used_at is not None or record.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = db.query(User).filter(User.user_id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    user.password_hash = hash_password(payload.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    record.used_at = datetime.now(timezone.utc)

    # Revoke all active sessions.
    db.query(UserSession).filter(
        UserSession.user_id == user.user_id, UserSession.is_revoked.is_(False)
    ).update({"is_revoked": True, "revoked_reason": "password_reset"})

    log_auth_event(db, "password_reset", True, request, user_id=user.user_id, org_id=user.org_id)
    db.commit()
    return MessageResponse(message="Password reset. Please sign in.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)

    db.query(UserSession).filter(
        UserSession.user_id == current_user.user_id, UserSession.is_revoked.is_(False)
    ).update({"is_revoked": True, "revoked_reason": "password_change"})

    log_auth_event(db, "password_change", True, request, user_id=current_user.user_id, org_id=current_user.org_id)
    db.commit()

    response = JSONResponse(content={"message": "Password changed. Please sign in again."})
    clear_auth_cookies(response)
    return response


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mfa = db.query(UserMfa).filter(UserMfa.user_id == current_user.user_id).first()
    return UserMeResponse(
        id=current_user.user_id,
        email=current_user.email_address,
        display_name=_display_name(current_user),
        first_name=current_user.fullname_first or "",
        last_name=current_user.fullname_last or "",
        username=current_user.user_name,
        phone=current_user.phone_number,
        role=current_user.access_role,
        org_id=current_user.org_id,
        email_verified=current_user.email_verified,
        mfa_enabled=bool(mfa and mfa.is_enabled),
        user_status=current_user.user_status.value,
    )


# ---------------------------------------------------------------------------
# MFA setup
# ---------------------------------------------------------------------------

@router.post("/mfa/setup", response_model=MfaSetupResponse)
def mfa_setup(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    secret = generate_totp_secret()
    backup_codes = generate_backup_codes()

    mfa = db.query(UserMfa).filter(UserMfa.user_id == current_user.user_id).first()
    if mfa and mfa.is_enabled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is already enabled")

    if not mfa:
        mfa = UserMfa(user_id=current_user.user_id)
        db.add(mfa)

    mfa.totp_secret_encrypted = encrypt_totp_secret(secret)
    mfa.is_enabled = False
    mfa.backup_codes = hash_backup_codes(backup_codes)
    db.commit()

    return MfaSetupResponse(
        secret=secret,
        qr_uri=get_totp_uri(secret, current_user.email_address),
        backup_codes=backup_codes,
    )


@router.post("/mfa/verify-setup", response_model=MessageResponse)
def mfa_verify_setup(
    payload: MfaVerifySetupRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mfa = db.query(UserMfa).filter(UserMfa.user_id == current_user.user_id).first()
    if not mfa:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start MFA setup first")

    if not verify_totp(decrypt_totp_secret(mfa.totp_secret_encrypted), payload.code.strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid code")

    mfa.is_enabled = True
    log_auth_event(db, "mfa_enabled", True, request, user_id=current_user.user_id, org_id=current_user.org_id)
    db.commit()
    return MessageResponse(message="MFA enabled.")


@router.delete("/mfa", response_model=MessageResponse)
def mfa_disable(
    payload: MfaDisableRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.password, current_user.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")

    mfa = db.query(UserMfa).filter(UserMfa.user_id == current_user.user_id).first()
    if mfa:
        db.delete(mfa)
    log_auth_event(db, "mfa_disabled", True, request, user_id=current_user.user_id, org_id=current_user.org_id)
    db.commit()
    return MessageResponse(message="MFA disabled.")
