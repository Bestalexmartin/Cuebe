# backend/schemas/sharing.py

from pydantic import BaseModel, model_validator, Field
from datetime import datetime
from uuid import UUID
from typing import Optional, List

# =============================================================================
# SCRIPT SHARING SCHEMAS
# =============================================================================

class ScriptShareCreate(BaseModel):
    """Schema for creating a new script share"""
    shared_with_user_id: UUID = Field(description="User ID of the crew member to share with")
    permissions: Optional[dict] = Field(default={"view": True, "download": False}, description="Access permissions")
    expires_at: Optional[datetime] = Field(None, description="When this share expires. Null = never expires")
    share_name: Optional[str] = Field(None, max_length=255, description="Optional name for this share")
    notes: Optional[str] = Field(None, description="Internal notes about this share")
    
    @model_validator(mode='before')
    def validate_permissions(cls, values):
        if isinstance(values, dict) and 'permissions' in values:
            permissions = values['permissions']
            if permissions is None:
                values['permissions'] = {"view": True, "download": False}
            elif "view" not in permissions:
                permissions["view"] = True
        return values


class ScriptShareUpdate(BaseModel):
    """Schema for updating an existing script share"""
    permissions: Optional[dict] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    share_name: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class ScriptShareResponse(BaseModel):
    """Schema for script share responses"""
    share_id: UUID
    script_id: UUID
    created_by: UUID
    shared_with_user_id: UUID
    share_token: str
    permissions: dict
    expires_at: Optional[datetime]
    is_active: bool
    access_count: int
    last_accessed_at: Optional[datetime]
    last_accessed_by_ip: Optional[str]
    share_name: Optional[str]
    notes: Optional[str]
    date_created: datetime
    date_updated: datetime
    
    # User info (computed from relationships)
    shared_with_user_name: Optional[str] = Field(None, description="Full name of the user this is shared with")
    shared_with_user_email: Optional[str] = Field(None, description="Email of the user this is shared with")
    
    # Computed fields
    is_expired: bool = Field(False, description="Whether this share has expired")
    share_url: str = Field("", description="Full URL for accessing this share")

    class Config:
        from_attributes = True


class ScriptShareListResponse(BaseModel):
    """Schema for listing script shares"""
    shares: List[ScriptShareResponse]
    total_count: int
    active_count: int
    expired_count: int


class SharedScriptAccessResponse(BaseModel):
    """Schema for accessing a shared script (public endpoint response)"""
    script_id: UUID
    script_name: str
    script_status: str
    show_name: Optional[str]
    venue_name: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    elements: List[dict]  # Filtered script elements
    departments: Optional[List[dict]]  # Department info for filtering
    permissions: dict
    last_updated: datetime
    
    # Share metadata (limited for security)
    share_name: Optional[str]
    expires_at: Optional[datetime]
    is_expired: bool = False

    class Config:
        from_attributes = True


class TokenValidationResponse(BaseModel):
    """Schema for token validation responses"""
    is_valid: bool
    script_id: Optional[UUID] = None
    shared_with_user_id: Optional[UUID] = None
    permissions: Optional[dict] = None
    expires_at: Optional[datetime] = None
    error_message: Optional[str] = None


class ShareUsageUpdate(BaseModel):
    """Schema for updating share usage stats"""
    access_count: int
    last_accessed_at: datetime
    last_accessed_by_ip: Optional[str] = None