# backend/routers/auth.py

import os
import time
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt
import logging

import models
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()
bearer_scheme = HTTPBearer()


def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> Dict:
    pem_key_str = os.getenv("CLERK_PEM_PUBLIC_KEY")
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


def get_current_user(
    claims: Dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> models.User:
    clerk_user_id = claims.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Optional authentication for public endpoints that benefit from user context
    Returns None if no valid authentication is provided
    """
    if not credentials:
        return None
    
    try:
        claims = get_current_user_claims(credentials)
        clerk_user_id = claims.get("sub")
        if not clerk_user_id:
            return None
        
        user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
        return user
    except Exception:
        # If authentication fails, return None instead of raising error
        return None


async def get_current_user_from_token(token_string: str, db: Session) -> models.User:
    """
    Validate JWT token and return user - for WebSocket authentication
    Raises HTTPException if token is invalid
    """
    pem_key_str = os.getenv("CLERK_PEM_PUBLIC_KEY")
    if not pem_key_str:
        raise HTTPException(status_code=500, detail="Missing PEM Public Key")

    pem_key = pem_key_str.replace("\\n", "\n")
    
    try:
        # Decode and verify the JWT
        decoded_claims = jwt.decode(token_string, pem_key, algorithms=["RS256"])
        
        # Validate timing claims
        current_time = int(time.time())
        if decoded_claims.get("exp", 0) < current_time:
            raise HTTPException(status_code=401, detail="Token expired")
        if decoded_claims.get("nbf", 0) > current_time:
            raise HTTPException(status_code=401, detail="Token not yet valid")
            
        # Get user from database
        clerk_user_id = decoded_claims.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return user
        
    except jwt.JWTError as e:
        logger.error(f"JWT validation failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")