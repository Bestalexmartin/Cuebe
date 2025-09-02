# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user
from utils.user_preferences import (
    bitmap_to_preferences,
    preferences_to_bitmap_updates,
    validate_preferences,
    DEFAULT_PREFERENCES_BITMAP
)

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig, rate_limit
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    limiter = None
    RateLimitConfig = None
    rate_limit = lambda x: lambda f: f  # No-op decorator when not available
    RATE_LIMITING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.get("/check-email")
def check_user_by_email(
    request: Request,
    email: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user exists by email address and return minimal info.

    Returns either null (not found) or a minimal object with the fields the
    frontend needs to immediately create a crew relationship without an extra fetch.
    """
    row = (
        db.query(
            models.User.user_id,
            models.User.fullname_first,
            models.User.fullname_last
        )
        .filter(models.User.email_address == email)
        .first()
    )

    if not row:
        return None

    user_id, first, last = row
    # Include both user_id and ID (alias) to match existing frontend expectations
    return {
        "user_id": str(user_id),
        "ID": str(user_id),
        "fullname_first": first,
        "fullname_last": last,
    }


@router.post("/create-guest-with-relationship", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
@rate_limit(RateLimitConfig.AUTH_ENDPOINTS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def create_guest_user_with_relationship(
    request: Request,
    guest_data: schemas.GuestUserCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a guest user with crew relationship in an atomic operation."""
    # Double-check user doesn't already exist
    existing_user = db.query(models.User).filter(models.User.email_address == guest_data.email_address).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new guest user
    new_guest_user = models.User(
        email_address=guest_data.email_address,
        fullname_first=guest_data.fullname_first,
        fullname_last=guest_data.fullname_last,
        user_role=guest_data.user_role,
        user_status=models.UserStatus.GUEST,  # Explicitly set as guest
        phone_number=guest_data.phone_number,
        notes=None,  # Notes belong in the relationship, not the user
        created_by=user.user_id,  # Track who created this guest user
        clerk_user_id=None,  # Clerk user ID will be set when webhooks sync data
        user_name=None,
        profile_img_url=None,
        is_active=True
    )
    db.add(new_guest_user)
    db.flush()  # Get the ID without committing
    
    # Create crew relationship
    crew_relationship = models.CrewRelationship(
        manager_user_id=user.user_id,
        crew_user_id=new_guest_user.user_id,
        notes=guest_data.notes
    )
    db.add(crew_relationship)
    
    # Commit both operations
    db.commit()
    db.refresh(new_guest_user)
    
    return new_guest_user


@router.get("/options", response_model=dict)
@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def get_user_options(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's preference options."""
    # Return user options or defaults if null
    default_options = {
        "colorize_dep_names": True,
        "auto_sort_cues": True,
        "show_clock_times": False
    }
    
    return user.user_prefs_json or default_options


@router.patch("/options", response_model=dict)
@rate_limit(RateLimitConfig.CRUD_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def update_user_options(
    request: Request,
    options: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's preference options."""
    # Validate that only known options are provided
    valid_options = {"colorize_dep_names", "auto_sort_cues", "show_clock_times"}
    
    # Filter to only include valid options and ensure they're boolean values
    filtered_options = {}
    for key, value in options.items():
        if key in valid_options:
            # Ensure boolean values
            if isinstance(value, bool):
                filtered_options[key] = value
            else:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Option '{key}' must be a boolean value"
                )
    
    if not filtered_options:
        raise HTTPException(
            status_code=400,
            detail="No valid options provided"
        )
    
    # Get current options or defaults
    current_options = user.user_prefs_json or {
        "colorize_dep_names": True,
        "auto_sort_cues": True,
        "show_clock_times": False
    }
    
    # Update with new values
    current_options.update(filtered_options)
    
    # Save to database
    user.user_prefs_json = current_options
    flag_modified(user, 'user_prefs_json')
    db.commit()
    db.refresh(user)
    
    return current_options


@router.get("/preferences", response_model=schemas.user.UserPreferences)
@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def get_user_preferences(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's preference settings from bitmap and JSON options."""
    # Get bitmap, default if null
    bitmap = user.user_prefs_bitmap
    if bitmap is None:
        bitmap = DEFAULT_PREFERENCES_BITMAP
        
    # Convert bitmap to preferences dict
    bitmap_preferences = bitmap_to_preferences(bitmap)
    
    # Get JSON preferences with defaults
    json_preferences = user.user_prefs_json or {}
    if 'auto_save_interval' not in json_preferences:
        json_preferences['auto_save_interval'] = 0  # Default: off
    if 'lookahead_seconds' not in json_preferences:
        json_preferences['lookahead_seconds'] = 30  # Default: 30 seconds
    
    # Combine both preference types and return as schema
    combined_preferences = {**bitmap_preferences, **json_preferences}
    return schemas.user.UserPreferences(**combined_preferences)


@router.patch("/preferences", response_model=schemas.user.UserPreferences)
@rate_limit(RateLimitConfig.CRUD_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
def update_user_preferences(
    request: Request,
    preference_updates: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's preference settings using bitmap system and JSON options."""
    
    # Separate bitmap preferences from JSON options
    bitmap_updates = {}
    json_updates = {}
    
    for key, value in preference_updates.items():
        if key == 'auto_save_interval':
            # Validate auto_save_interval
            if not isinstance(value, int) or (value != 0 and (value < 10 or value > 300)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid auto_save_interval: {value}. Must be 0 (off) or between 10-300 seconds."
                )
            json_updates[key] = value
        elif key == 'lookahead_seconds':
            # Validate lookahead_seconds
            if not isinstance(value, int) or (value < 5 or value > 60):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid lookahead_seconds: {value}. Must be between 5-60 seconds."
                )
            json_updates[key] = value
        else:
            bitmap_updates[key] = value
    
    # Validate bitmap preference updates
    if bitmap_updates:
        validation_errors = validate_preferences(bitmap_updates)
        if validation_errors:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid preferences: {validation_errors}"
            )
    
    # Update bitmap preferences
    if bitmap_updates:
        current_bitmap = user.user_prefs_bitmap
        if current_bitmap is None:
            current_bitmap = DEFAULT_PREFERENCES_BITMAP
        
        updated_bitmap = preferences_to_bitmap_updates(current_bitmap, bitmap_updates)
        user.user_prefs_bitmap = updated_bitmap
    
    # Update JSON preferences
    if json_updates:
        current_json_prefs = user.user_prefs_json or {}
        current_json_prefs.update(json_updates)
        user.user_prefs_json = current_json_prefs
        flag_modified(user, "user_prefs_json")  # Mark JSON field as modified
    
    # Save to database
    db.commit()
    db.refresh(user)
    
    # Return combined preferences
    bitmap_preferences = bitmap_to_preferences(user.user_prefs_bitmap or DEFAULT_PREFERENCES_BITMAP)
    json_preferences = user.user_prefs_json or {}
    
    combined_preferences = {**bitmap_preferences, **json_preferences}
    return schemas.user.UserPreferences(**combined_preferences)
