# backend/routers/system_tests/__init__.py

# backend/routers/system_tests package

import time
import socket
import logging
import subprocess
import json as json_lib
import os
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from routers.auth import get_current_user
import models

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig
    RATE_LIMITING_AVAILABLE = True
except ImportError:  # pragma: no cover - optional dependency
    limiter = None
    RateLimitConfig = None
    RATE_LIMITING_AVAILABLE = False

# Psutil import with proper type handling
HAS_PSUTIL = False
psutil = None
try:
    import psutil  # type: ignore
    HAS_PSUTIL = True
except ImportError:  # pragma: no cover - optional dependency
    psutil = None  # type: ignore
    HAS_PSUTIL = False

# Redis import with proper type handling
HAS_REDIS = False
redis = None
RedisConnectionError = Exception
try:
    import redis  # type: ignore
    from redis.exceptions import ConnectionError as RedisConnectionError  # type: ignore
    HAS_REDIS = True
except ImportError:  # pragma: no cover - optional dependency
    redis = None  # type: ignore
    RedisConnectionError = Exception  # type: ignore
    HAS_REDIS = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system-tests", tags=["system-tests"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator

# Import endpoint modules which register routes on import
from . import general, speed_tests, filesystem_checks, external_service_checks  # noqa: E402
