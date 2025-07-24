# backend/utils/rate_limiter.py

import os
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

# Optional Redis import
try:
    import redis
    HAS_REDIS = True
except ImportError:
    redis = None
    HAS_REDIS = False

logger = logging.getLogger(__name__)

# Rate limiting configuration
class RateLimitConfig:
    # General API limits
    GENERAL_API = "100/minute"  # 100 requests per minute for general endpoints
    
    # Authentication limits (more restrictive)
    AUTH_ENDPOINTS = "10/minute"  # Login, registration attempts
    
    # CRUD operations (moderate)
    CRUD_OPERATIONS = "60/minute"  # Create, update, delete operations
    
    # Read operations (less restrictive)
    READ_OPERATIONS = "200/minute"  # GET requests
    
    # System tests (restricted)
    SYSTEM_TESTS = "5/minute"  # System testing endpoints
    
    # Webhooks (more permissive for external services)
    WEBHOOKS = "500/minute"  # Clerk webhooks, health checks

def create_redis_connection():
    """Create Redis connection for rate limiting storage"""
    if not HAS_REDIS or redis is None:
        logger.info("Redis not available, using in-memory rate limiting")
        return None
        
    try:
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_db = int(os.getenv("REDIS_DB", "1"))  # Use DB 1 for rate limiting
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # Test connection
        redis_client.ping()
        logger.info(f"Connected to Redis for rate limiting: {redis_host}:{redis_port}/{redis_db}")
        return redis_client
        
    except Exception as e:
        logger.warning(f"Failed to connect to Redis for rate limiting: {e}")
        logger.info("Falling back to in-memory rate limiting")
        return None

def get_rate_limit_key(request: Request):
    """
    Generate rate limit key based on client IP and user info
    This can be customized to use user ID, API key, etc.
    """
    # Try to get user info from JWT token if available
    user_id = getattr(request.state, 'user_id', None)
    
    if user_id:
        return f"user:{user_id}"
    else:
        # Fall back to IP address
        return get_remote_address(request)

def create_limiter():
    """Create and configure the rate limiter"""
    redis_client = create_redis_connection()
    
    if redis_client:
        # Use Redis for distributed rate limiting
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = os.getenv("REDIS_PORT", "6379")
        redis_db = os.getenv("REDIS_DB", "1")
        storage_uri = f"redis://{redis_host}:{redis_port}/{redis_db}"
        
        limiter = Limiter(
            key_func=get_rate_limit_key,
            storage_uri=storage_uri
        )
        logger.info("Rate limiter configured with Redis backend")
    else:
        # Use in-memory storage (not recommended for production)
        limiter = Limiter(
            key_func=get_rate_limit_key
        )
        logger.info("Rate limiter configured with in-memory backend")
    
    return limiter

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded responses"""
    response_data = {
        "error": "Rate limit exceeded",
        "message": f"You have exceeded the rate limit. Please try again later.",
        "limit": str(exc.detail).split(" ")[0] if exc.detail else "Unknown",
        "retry_after": getattr(exc, 'retry_after', 60)
    }
    
    logger.warning(f"Rate limit exceeded for {get_rate_limit_key(request)}: {exc.detail}")
    
    return JSONResponse(
        status_code=429,
        content=response_data,
        headers={
            "Retry-After": str(getattr(exc, 'retry_after', 60)),
            "X-RateLimit-Limit": str(exc.detail).split(" ")[0] if exc.detail else "Unknown",
            "X-RateLimit-Remaining": "0"
        }
    )

# Create the global limiter instance
limiter = create_limiter()