"""
Middleware for token-based authentication for shared script access
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import ScriptShare, Script


class ShareTokenValidator:
    """Validates and manages script sharing tokens"""
    
    @staticmethod
    def validate_token(token: str, db: Session) -> Dict[str, Any]:
        """
        Validate a share token and return share information
        
        Returns:
            Dict containing share info if valid, raises HTTPException if invalid
        """
        # Find the share record
        script_share = db.query(ScriptShare).filter(ScriptShare.share_token == token).first()
        
        if not script_share:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid sharing token"
            )
        
        # Check if share is active
        if not script_share.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This sharing link has been revoked"
            )
        
        # Check expiration
        if script_share.expires_at and script_share.expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This sharing link has expired"
            )
        
        # Get associated script
        script = db.query(Script).filter(Script.script_id == script_share.script_id).first()
        if not script:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated script not found"
            )
        
        return {
            "share": script_share,
            "script": script,
            "permissions": script_share.permissions or {"view": True, "download": False},
            "shared_with_user_id": script_share.shared_with_user_id
        }
    
    @staticmethod
    def update_access_tracking(
        token: str,
        request: Request,
        db: Session,
        user_id: Optional[str] = None
    ) -> None:
        """Update access tracking for a shared script"""
        script_share = db.query(ScriptShare).filter(ScriptShare.share_token == token).first()
        
        if script_share:
            script_share.access_count += 1
            script_share.last_accessed_at = datetime.now(timezone.utc)
            script_share.last_accessed_by_ip = request.client.host if request.client else None
            
            # Could extend to track user access if authenticated
            # script_share.last_accessed_by_user_id = user_id
            
            db.commit()


def get_validated_share_token(
    token: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency to validate a share token and return share information
    
    Usage in route:
    ```python
    @app.get("/shared-scripts/{token}")
    async def access_shared_script(
        share_info: Dict[str, Any] = Depends(get_validated_share_token)
    ):
        script = share_info["script"]
        permissions = share_info["permissions"]
        ...
    ```
    """
    return ShareTokenValidator.validate_token(token, db)


def check_share_permission(
    permission: str,
    share_info: Dict[str, Any]
) -> bool:
    """
    Check if a share has a specific permission
    
    Args:
        permission: The permission to check (e.g., "view", "download")
        share_info: Share info dict from get_validated_share_token
    
    Returns:
        True if permission is granted, False otherwise
    """
    permissions = share_info.get("permissions", {})
    return permissions.get(permission, False)


def require_share_permission(permission: str):
    """
    Decorator to require a specific share permission
    
    Usage:
    ```python
    @require_share_permission("download")
    async def download_script(share_info: Dict[str, Any]):
        # This will only run if download permission is granted
        pass
    ```
    """
    def decorator(func):
        def wrapper(share_info: Dict[str, Any], *args, **kwargs):
            if not check_share_permission(permission, share_info):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"This sharing link does not have '{permission}' permission"
                )
            return func(share_info, *args, **kwargs)
        return wrapper
    return decorator


class ShareAccessLogger:
    """Logs access to shared scripts for audit purposes"""
    
    @staticmethod
    def log_access(
        token: str,
        request: Request,
        user_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """
        Log access attempt to shared script
        
        This could be extended to write to a separate audit log table
        or external logging service for security monitoring
        """
        import logging
        
        logger = logging.getLogger("script_sharing")
        
        log_data = {
            "token": token[:8] + "...",  # Only log first 8 chars for security
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown"),
            "user_id": user_id,
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if error_message:
            log_data["error"] = error_message
        
        if success:
            logger.info(f"Shared script access: {log_data}")
        else:
            logger.warning(f"Failed shared script access: {log_data}")


def apply_department_filter(elements: list, department_filter: Optional[list]) -> list:
    """
    Filter script elements by department
    
    Args:
        elements: List of script elements
        department_filter: List of department IDs to include, None means all
    
    Returns:
        Filtered list of elements
    """
    if not department_filter:
        return elements
    
    # Convert to set for faster lookup
    allowed_departments = set(str(dept_id) for dept_id in department_filter)
    
    return [
        element for element in elements 
        if element.department_id is None or str(element.department_id) in allowed_departments
    ]


class ShareTokenCache:
    """
    Simple in-memory cache for validated share tokens
    In production, this could be Redis or another caching solution
    """
    
    _cache = {}
    _cache_timeout = 300  # 5 minutes
    
    @classmethod
    def get(cls, token: str) -> Optional[Dict[str, Any]]:
        """Get cached share info"""
        if token in cls._cache:
            cached_data, timestamp = cls._cache[token]
            if datetime.now(timezone.utc).timestamp() - timestamp < cls._cache_timeout:
                return cached_data
            else:
                # Expired, remove from cache
                del cls._cache[token]
        return None
    
    @classmethod
    def set(cls, token: str, share_info: Dict[str, Any]) -> None:
        """Cache share info"""
        cls._cache[token] = (share_info, datetime.now(timezone.utc).timestamp())
    
    @classmethod
    def invalidate(cls, token: str) -> None:
        """Remove token from cache (use when token is revoked)"""
        if token in cls._cache:
            del cls._cache[token]
    
    @classmethod
    def clear(cls) -> None:
        """Clear all cached tokens"""
        cls._cache.clear()