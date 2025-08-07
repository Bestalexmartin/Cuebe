# backend/schemas.py

from pydantic import BaseModel, model_validator, field_validator, Field
from datetime import date, timedelta, datetime
from uuid import UUID
from typing import List, Optional, Any

# =============================================================================
# USER SCHEMAS
# =============================================================================

class User(BaseModel):
    user_id: UUID  # CHANGED TO UUID
    clerk_user_id: Optional[str] = None  # Nullable for guest users
    email_address: str
    fullname_first: str
    fullname_last: str
    user_name: Optional[str] = None
    profile_img_url: Optional[str] = None
    phone_number: Optional[str] = None
    user_status: str  # 'guest' or 'verified'
    user_role: str
    created_by: Optional[UUID] = None  # CHANGED TO UUID
    notes: Optional[str] = None
    user_prefs_json: Optional[dict] = None
    is_active: bool
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True

class CrewMemberCreate(BaseModel):
    email_address: str
    fullname_first: str
    fullname_last: str
    user_role: str

class GuestUserCreate(BaseModel):
    email_address: str
    fullname_first: str
    fullname_last: str
    user_role: str = "crew"
    phone_number: Optional[str] = None
    notes: Optional[str] = None

class CrewRelationshipCreate(BaseModel):
    crew_user_id: UUID  # CHANGED TO UUID
    notes: Optional[str] = None

class CrewMemberWithRelationship(BaseModel):
    """User data combined with relationship notes for crew management"""
    # User fields
    user_id: UUID
    clerk_user_id: Optional[str] = None
    email_address: str
    fullname_first: str
    fullname_last: str
    user_name: Optional[str] = None
    profile_img_url: Optional[str] = None
    phone_number: Optional[str] = None
    user_status: str
    user_role: str
    created_by: Optional[UUID] = None
    notes: Optional[str] = None  # Notes from User table
    is_active: bool
    date_created: datetime
    date_updated: datetime
    
    # Relationship fields
    relationship_notes: Optional[str] = None  # Notes from CrewRelationship
    
    class Config:
        from_attributes = True

# =============================================================================
# VENUE SCHEMAS
# =============================================================================

class VenueBase(BaseModel):
    venue_name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    capacity: Optional[int] = None
    venue_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    stage_width: Optional[int] = None
    stage_depth: Optional[int] = None
    fly_height: Optional[int] = None
    equipment: Optional[List[str]] = None
    venue_notes: Optional[str] = None
    rental_rate: Optional[int] = None
    minimum_rental: Optional[int] = None

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    venue_id: UUID  # CHANGED TO UUID
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# DEPARTMENT SCHEMAS
# =============================================================================

class DepartmentCreate(BaseModel):
    department_name: str
    department_description: Optional[str] = None
    department_color: str
    department_initials: Optional[str] = None

class Department(BaseModel):
    department_id: UUID  # CHANGED TO UUID
    department_name: str
    department_description: Optional[str] = None
    department_color: str
    department_initials: Optional[str] = None
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# SHOW SCHEMAS
# =============================================================================

class ShowCreate(BaseModel):
    show_name: str
    venue_id: Optional[UUID] = None
    show_date: Optional[datetime] = None
    show_duration: Optional[datetime] = None  # End time of show
    show_notes: Optional[str] = None
    deadline: Optional[datetime] = None

class CrewAssignment(BaseModel):
    """Schema for show-level crew assignments"""
    assignment_id: UUID
    show_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool
    date_assigned: datetime

    class Config:
        from_attributes = True

class CrewAssignmentCreate(BaseModel):
    """Schema for creating crew assignments"""
    assignment_id: Optional[UUID] = None  # For updates
    show_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool = True

class CrewAssignmentBulkRequest(BaseModel):
    """Schema for bulk crew assignment updates"""
    assignments: List[CrewAssignmentCreate]

class CrewMemberWithDetails(BaseModel):
    """Schema for crew member with user and department details - used for script sharing"""
    assignment_id: UUID
    user_id: UUID
    department_id: UUID
    show_role: Optional[str] = None
    is_active: bool
    date_assigned: datetime
    
    # User details
    fullname_first: str
    fullname_last: str
    email_address: str
    user_status: str
    
    # Department details
    department_name: str
    department_color: Optional[str] = None
    department_initials: Optional[str] = None

    class Config:
        from_attributes = True

class Show(BaseModel):
    show_id: UUID
    owner_id: UUID
    show_name: str
    venue: Optional[Venue] = None
    show_date: Optional[datetime] = None
    show_duration: Optional[datetime] = None  # End time of show
    show_notes: Optional[str] = None
    deadline: Optional[datetime] = None
    date_created: datetime
    date_updated: datetime
    
    # Forward reference to Script (defined below)
    scripts: List['Script'] = []
    crew: List[CrewAssignment] = []

    class Config:
        from_attributes = True

# =============================================================================
# SCRIPT SCHEMAS
# =============================================================================

class ScriptCreate(BaseModel):
    script_name: Optional[str] = None
    script_notes: Optional[str] = None
    script_status: Optional[str] = None
    end_time: Optional[datetime] = None  # Planned end time

class Script(BaseModel):
    script_id: UUID  # ALREADY UUID
    script_name: str
    script_notes: Optional[str] = None
    script_status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None  # Planned end time
    show_id: UUID  # ALREADY UUID
    owner_id: UUID  # Missing field needed for authorization
    date_created: datetime
    date_updated: datetime
    
    # Forward reference to ScriptElement (defined below) - Optional for dashboard performance
    elements: Optional[List['ScriptElement']] = []

    class Config:
        from_attributes = True

class ScriptUpdate(BaseModel):
    script_name: Optional[str] = None
    script_notes: Optional[str] = None
    script_status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None  # Planned end time

# =============================================================================
# SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementFromDB(BaseModel):
    """Schema for script elements coming FROM the database"""
    element_id: UUID  # CHANGED TO UUID
    script_id: UUID  # CHANGED TO UUID

    class Config:
        from_attributes = True

class ScriptElement(BaseModel):
    """Schema for script elements going TO the frontend"""
    element_id: UUID  # CHANGED TO UUID
    script_id: UUID  # CHANGED TO UUID
    department_id: Optional[UUID] = None  # CHANGED TO UUID
    element_type: str
    cue_number: Optional[str] = None
    element_description: Optional[str] = None

    class Config:
        from_attributes = True

# =============================================================================
# ENHANCED SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementCreate(BaseModel):
    """Schema for creating new script elements"""
    element_type: str  # 'CUE', 'NOTE'
    sequence: Optional[int] = None  # Auto-calculated if not provided
    time_offset_ms: Optional[int] = 0  # Time offset in milliseconds
    trigger_type: Optional[str] = "MANUAL"  # 'MANUAL', 'TIME', 'AUTO', 'FOLLOW', 'GO', 'STANDBY'
    cue_id: Optional[str] = None
    description: str = ""
    cue_notes: Optional[str] = None
    department_id: Optional[UUID] = None
    location: Optional[str] = None  # LocationArea enum values
    location_details: Optional[str] = None
    duration: Optional[int] = None  # Duration in milliseconds
    fade_in: Optional[int] = None  # Fade in time in milliseconds
    fade_out: Optional[int] = None  # Fade out time in milliseconds
    priority: Optional[str] = "NORMAL"  # 'SAFETY', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'OPTIONAL'
    parent_element_id: Optional[UUID] = None  # For grouped elements
    group_level: Optional[int] = 0
    department_color: Optional[str] = None  # Hex color override
    custom_color: Optional[str] = None  # Custom color for element

class ScriptElementUpdate(BaseModel):
    """Schema for updating script elements"""
    element_type: Optional[str] = None
    sequence: Optional[int] = None
    time_offset_ms: Optional[int] = None
    trigger_type: Optional[str] = None
    follows_cue_id: Optional[str] = None
    cue_id: Optional[str] = None
    description: Optional[str] = None
    cue_notes: Optional[str] = None
    department_id: Optional[UUID] = None
    location: Optional[str] = None
    location_details: Optional[str] = None
    duration: Optional[int] = None
    fade_in: Optional[int] = None
    fade_out: Optional[int] = None
    priority: Optional[str] = None
    execution_status: Optional[str] = None  # 'pending', 'ready', 'executing', 'completed', 'skipped', 'failed'
    parent_element_id: Optional[UUID] = None
    group_level: Optional[int] = None
    is_collapsed: Optional[bool] = None
    department_color: Optional[str] = None
    custom_color: Optional[str] = None

# Removed unused schemas:
# - ScriptElementEquipment
# - ScriptElementCrewAssignment (different from show-level CrewAssignment)
# - ScriptElementConditionalRule

class ScriptElementEnhanced(BaseModel):
    """Enhanced schema for script elements with all new fields"""
    element_id: UUID
    script_id: UUID
    element_type: str
    sequence: Optional[int] = None
    
    # Timing fields
    time_offset_ms: int = 0  # Timing in milliseconds
    duration: Optional[int] = None
    fade_in: Optional[int] = None
    fade_out: Optional[int] = None
    
    # Trigger and execution
    trigger_type: str = "manual"
    follows_cue_id: Optional[str] = None
    execution_status: str = "pending"
    priority: str = "normal"
    
    # Content
    cue_id: Optional[str] = None
    cue_number: Optional[str] = None  # Legacy field
    description: str = ""
    element_description: Optional[str] = None  # Legacy field
    cue_notes: Optional[str] = None
    
    # Location and visual
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None  # Computed from department relationship
    department_color: Optional[str] = None  # Computed from department relationship
    department_initials: Optional[str] = None  # Computed from department relationship
    location: Optional[str] = None
    location_details: Optional[str] = None
    custom_color: Optional[str] = None
    
    # Grouping and hierarchy
    parent_element_id: Optional[UUID] = None
    group_level: int = 0
    is_collapsed: bool = False
    
    # Metadata
    version: int = 1
    
    # System fields
    is_active: bool = True
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    date_created: datetime
    date_updated: datetime
    
    # Relationships (removed unused features)
    
    class Config:
        from_attributes = True
    
    @model_validator(mode='before')
    @classmethod
    def populate_department_fields(cls, data):
        """Populate department name, color, and initials from department relationship"""
        if hasattr(data, 'department') and data.department:
            # If this is a SQLAlchemy model instance with department relationship
            data.department_name = data.department.department_name
            data.department_color = data.department.department_color
            data.department_initials = data.department.department_initials
        elif isinstance(data, dict):
            # If this is already a dict, check if department data is available
            department = data.get('department')
            if department:
                data['department_name'] = department.get('department_name')
                data['department_color'] = department.get('department_color')
                data['department_initials'] = department.get('department_initials')
        return data

# Note: ScriptElement and ScriptElementEnhanced are separate schemas for different use cases

# =============================================================================
# BULK OPERATION SCHEMAS
# =============================================================================

class ScriptElementReorderItem(BaseModel):
    """Schema for individual element in reorder operation"""
    element_id: UUID
    sequence: int

class ScriptElementReorderRequest(BaseModel):
    """Schema for bulk reordering script elements"""
    elements: List[ScriptElementReorderItem]

class ScriptElementBulkUpdate(BaseModel):
    """Schema for bulk updating script elements"""
    element_ids: List[UUID]
    department_id: Optional[UUID] = None
    priority: Optional[str] = None
    execution_status: Optional[str] = None
    location: Optional[str] = None
    custom_color: Optional[str] = None

# Edit Queue Batch Operations
class EditQueueOperation(BaseModel):
    """Base schema for edit queue operations"""
    id: str
    timestamp: int
    element_id: str
    description: str
    type: str

class ReorderEditOperation(EditQueueOperation):
    """Schema for reorder operations"""
    type: str = "REORDER"
    old_index: int
    new_index: int
    old_sequence: int
    new_sequence: int

class UpdateFieldEditOperation(EditQueueOperation):
    """Schema for field update operations"""
    type: str = "UPDATE_FIELD"
    field: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None

class UpdateTimeOffsetEditOperation(EditQueueOperation):
    """Schema for time offset update operations"""
    type: str = "UPDATE_TIME_OFFSET"
    old_time_offset_ms: int
    new_time_offset_ms: int

class CreateElementEditOperation(EditQueueOperation):
    """Schema for element creation operations"""
    type: str = "CREATE_ELEMENT"
    element_data: dict

class DeleteElementEditOperation(EditQueueOperation):
    """Schema for element deletion operations"""
    type: str = "DELETE_ELEMENT"
    element_data: dict

class BulkReorderEditOperation(EditQueueOperation):
    """Schema for bulk reorder operations"""
    type: str = "BULK_REORDER"
    element_changes: List[dict]

class EditQueueBatchRequest(BaseModel):
    """Schema for batch processing edit queue operations"""
    operations: List[dict]  # Will be parsed based on 'type' field

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

