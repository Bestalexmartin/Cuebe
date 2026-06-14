# backend/routers/auth.py

import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt
import jwt as pyjwt
import logging

import models
from config import settings
from database import get_db
from middleware.auth import (
    get_current_user as _blok_get_current_user,
    get_current_user_optional as _blok_get_current_user_optional,
)
from services.auth_service import decode_token

logger = logging.getLogger(__name__)

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> models.User:
    """
    Current-user dependency.

    Delegates to the Blok 017 middleware (HS256 JWT in the bk_access cookie or
    Authorization: Bearer header). Re-exported here so existing routers that do
    `from .auth import get_current_user` keep working unchanged.
    """
    return _blok_get_current_user(request, db)


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """
    Optional current-user dependency for public endpoints that benefit from
    user context. Returns None when no valid token is present.

    Delegates to the Blok 017 middleware.
    """
    return _blok_get_current_user_optional(request, db)


async def get_current_user_from_token(token_string: str, db: Session) -> models.User:
    """
    Validate a Blok 017 HS256 access token and return the user.

    Used for WebSocket authentication where the token arrives as a query/body
    string rather than via a cookie or header.
    """
    try:
        payload = decode_token(token_string, expected_type="access")
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError as e:
        logger.error(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")

    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return user


# ---------------------------------------------------------------------------
# Legacy Clerk verification helpers (RS256). No longer on the request path; the
# current-user dependency now delegates to Blok 017. Retained until the Clerk
# Teardown card removes them so any remaining references keep importing cleanly.
# ---------------------------------------------------------------------------

def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> Dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    pem_key_str = settings.clerk_pem_public_key
    if not pem_key_str:
        raise HTTPException(status_code=500, detail="Missing PEM Public Key")

    pem_key = pem_key_str.replace("\\n", "\n")
    token = credentials.credentials

    try:
        decoded_claims = jwt.decode(
            token,
            pem_key,
            algorithms=["RS256"],
            options={"verify_signature": True}
        )

        current_time = time.time()
        if decoded_claims.get("exp", 0) < current_time:
            raise HTTPException(status_code=401, detail="Token has expired")
        if decoded_claims.get("nbf", 0) > current_time:
            raise HTTPException(status_code=401, detail="Token not yet valid")
        return decoded_claims
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
