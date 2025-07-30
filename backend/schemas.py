# backend/schemas.py

from pydantic import BaseModel, model_validator, field_validator
from datetime import date, timedelta, datetime
from uuid import UUID
from typing import List, Optional

# =============================================================================
# USER SCHEMAS
# =============================================================================

class User(BaseModel):
    userID: UUID  # CHANGED TO UUID
    clerk_user_id: Optional[str] = None  # Nullable for guest users
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userName: Optional[str] = None
    profileImgURL: Optional[str] = None
    phoneNumber: Optional[str] = None
    userStatus: str  # 'guest' or 'verified'
    userRole: str
    createdBy: Optional[UUID] = None  # CHANGED TO UUID
    notes: Optional[str] = None
    userOptions: Optional[dict] = None
    isActive: bool
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

class CrewMemberCreate(BaseModel):
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userRole: str

class GuestUserCreate(BaseModel):
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userRole: str = "crew"
    phoneNumber: Optional[str] = None
    notes: Optional[str] = None

class CrewRelationshipCreate(BaseModel):
    crew_user_id: UUID  # CHANGED TO UUID
    notes: Optional[str] = None

class CrewMemberWithRelationship(BaseModel):
    """User data combined with relationship notes for crew management"""
    # User fields
    userID: UUID
    clerk_user_id: Optional[str] = None
    emailAddress: str
    fullnameFirst: str
    fullnameLast: str
    userName: Optional[str] = None
    profileImgURL: Optional[str] = None
    phoneNumber: Optional[str] = None
    userStatus: str
    userRole: str
    createdBy: Optional[UUID] = None
    notes: Optional[str] = None  # Notes from User table
    isActive: bool
    dateCreated: datetime
    dateUpdated: datetime
    
    # Relationship fields
    relationshipNotes: Optional[str] = None  # Notes from CrewRelationship
    
    class Config:
        from_attributes = True

# =============================================================================
# VENUE SCHEMAS
# =============================================================================

class VenueBase(BaseModel):
    venueName: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    capacity: Optional[int] = None
    venueType: Optional[str] = None
    contactName: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    stageWidth: Optional[int] = None
    stageDepth: Optional[int] = None
    flyHeight: Optional[int] = None
    equipment: Optional[List[str]] = None
    venueNotes: Optional[str] = None
    rentalRate: Optional[int] = None
    minimumRental: Optional[int] = None

class VenueCreate(VenueBase):
    pass

class Venue(VenueBase):
    venueID: UUID  # CHANGED TO UUID
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# DEPARTMENT SCHEMAS
# =============================================================================

class DepartmentCreate(BaseModel):
    departmentName: str
    departmentDescription: Optional[str] = None
    departmentColor: str
    departmentInitials: Optional[str] = None

class Department(BaseModel):
    departmentID: UUID  # CHANGED TO UUID
    departmentName: str
    departmentDescription: Optional[str] = None
    departmentColor: str
    departmentInitials: Optional[str] = None
    dateCreated: datetime
    dateUpdated: datetime

    class Config:
        from_attributes = True

# =============================================================================
# SHOW SCHEMAS
# =============================================================================

class ShowCreate(BaseModel):
    showName: str
    venueID: Optional[UUID] = None
    showDate: Optional[datetime] = None
    showDuration: Optional[datetime] = None  # End time of show
    showNotes: Optional[str] = None
    deadline: Optional[datetime] = None

class Show(BaseModel):
    showID: UUID
    ownerID: UUID
    showName: str
    venue: Optional[Venue] = None
    showDate: Optional[datetime] = None
    showDuration: Optional[datetime] = None  # End time of show
    showNotes: Optional[str] = None
    deadline: Optional[datetime] = None
    dateCreated: datetime
    dateUpdated: datetime
    
    # Forward reference to Script (defined below)
    scripts: List['Script'] = []

    class Config:
        from_attributes = True

# =============================================================================
# SCRIPT SCHEMAS
# =============================================================================

class ScriptCreate(BaseModel):
    scriptName: Optional[str] = None
    scriptNotes: Optional[str] = None
    scriptStatus: Optional[str] = None
    endTime: Optional[datetime] = None  # Planned end time

class Script(BaseModel):
    scriptID: UUID  # ALREADY UUID
    scriptName: str
    scriptNotes: Optional[str] = None
    scriptStatus: str
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None  # Planned end time
    showID: UUID  # ALREADY UUID
    dateCreated: datetime
    dateUpdated: datetime
    
    # Forward reference to ScriptElement (defined below) - Optional for dashboard performance
    elements: Optional[List['ScriptElement']] = []

    class Config:
        from_attributes = True

class ScriptUpdate(BaseModel):
    scriptName: Optional[str] = None
    scriptNotes: Optional[str] = None
    scriptStatus: Optional[str] = None
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None  # Planned end time

# =============================================================================
# SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementFromDB(BaseModel):
    """Schema for script elements coming FROM the database"""
    elementID: UUID  # CHANGED TO UUID
    scriptID: UUID  # CHANGED TO UUID

    class Config:
        from_attributes = True

class ScriptElement(BaseModel):
    """Schema for script elements going TO the frontend"""
    elementID: UUID  # CHANGED TO UUID
    scriptID: UUID  # CHANGED TO UUID
    departmentID: Optional[UUID] = None  # CHANGED TO UUID
    elementType: str
    elementOrder: int
    cueNumber: Optional[str] = None
    elementDescription: Optional[str] = None

    class Config:
        from_attributes = True

# =============================================================================
# ENHANCED SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementCreate(BaseModel):
    """Schema for creating new script elements"""
    elementType: str  # 'CUE', 'NOTE'
    sequence: Optional[int] = None  # Auto-calculated if not provided
    timeOffsetMs: Optional[int] = 0  # Time offset in milliseconds
    triggerType: Optional[str] = "MANUAL"  # 'MANUAL', 'TIME', 'AUTO', 'FOLLOW', 'GO', 'STANDBY'
    cueID: Optional[str] = None
    description: str = ""
    cueNotes: Optional[str] = None
    departmentID: Optional[UUID] = None
    location: Optional[str] = None  # LocationArea enum values
    locationDetails: Optional[str] = None
    duration: Optional[int] = None  # Duration in milliseconds
    fadeIn: Optional[int] = None  # Fade in time in milliseconds
    fadeOut: Optional[int] = None  # Fade out time in milliseconds
    priority: Optional[str] = "NORMAL"  # 'CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'OPTIONAL'
    parentElementID: Optional[UUID] = None  # For grouped elements
    groupLevel: Optional[int] = 0
    isSafetyCritical: Optional[bool] = False
    safetyNotes: Optional[str] = None
    departmentColor: Optional[str] = None  # Hex color override
    customColor: Optional[str] = None  # Custom color for element

class ScriptElementUpdate(BaseModel):
    """Schema for updating script elements"""
    elementType: Optional[str] = None
    sequence: Optional[int] = None
    timeOffsetMs: Optional[int] = None
    triggerType: Optional[str] = None
    followsCueID: Optional[str] = None
    cueID: Optional[str] = None
    description: Optional[str] = None
    cueNotes: Optional[str] = None
    departmentID: Optional[UUID] = None
    location: Optional[str] = None
    locationDetails: Optional[str] = None
    duration: Optional[int] = None
    fadeIn: Optional[int] = None
    fadeOut: Optional[int] = None
    priority: Optional[str] = None
    executionStatus: Optional[str] = None  # 'pending', 'ready', 'executing', 'completed', 'skipped', 'failed'
    parentElementID: Optional[UUID] = None
    groupLevel: Optional[int] = None
    isCollapsed: Optional[bool] = None
    isSafetyCritical: Optional[bool] = None
    safetyNotes: Optional[str] = None
    departmentColor: Optional[str] = None
    customColor: Optional[str] = None

class ScriptElementEquipment(BaseModel):
    """Schema for script element equipment requirements"""
    equipmentName: str
    isRequired: bool = True
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class ScriptElementCrewAssignment(BaseModel):
    """Schema for script element crew assignments"""
    crewID: UUID
    assignmentRole: Optional[str] = None
    isLead: bool = False
    
    class Config:
        from_attributes = True

class ScriptElementConditionalRule(BaseModel):
    """Schema for script element conditional rules"""
    ruleID: UUID
    conditionType: str  # 'weather', 'cast', 'equipment', 'time', 'custom'
    operator: str  # 'equals', 'not_equals', 'contains', 'greater_than', 'less_than'
    conditionValue: str
    description: str
    isActive: bool = True
    
    class Config:
        from_attributes = True

class ScriptElementEnhanced(BaseModel):
    """Enhanced schema for script elements with all new fields"""
    elementID: UUID
    scriptID: UUID
    elementType: str
    sequence: Optional[int] = None
    elementOrder: int  # Legacy field
    
    # Timing fields
    timeOffsetMs: int = 0  # Timing in milliseconds
    duration: Optional[int] = None
    fadeIn: Optional[int] = None
    fadeOut: Optional[int] = None
    
    # Trigger and execution
    triggerType: str = "manual"
    followsCueID: Optional[str] = None
    executionStatus: str = "pending"
    priority: str = "normal"
    
    # Content
    cueID: Optional[str] = None
    cueNumber: Optional[str] = None  # Legacy field
    description: str = ""
    elementDescription: Optional[str] = None  # Legacy field
    cueNotes: Optional[str] = None
    
    # Location and visual
    departmentID: Optional[UUID] = None
    departmentName: Optional[str] = None  # Computed from department relationship
    departmentColor: Optional[str] = None  # Computed from department relationship
    departmentInitials: Optional[str] = None  # Computed from department relationship
    location: Optional[str] = None
    locationDetails: Optional[str] = None
    customColor: Optional[str] = None
    
    # Grouping and hierarchy
    parentElementID: Optional[UUID] = None
    groupLevel: int = 0
    isCollapsed: bool = False
    
    # Safety and metadata
    isSafetyCritical: bool = False
    safetyNotes: Optional[str] = None
    version: int = 1
    
    # System fields
    isActive: bool = True
    createdBy: Optional[UUID] = None
    updatedBy: Optional[UUID] = None
    dateCreated: datetime
    dateUpdated: datetime
    
    # Relationships
    equipment: List[ScriptElementEquipment] = []
    crew_assignments: List[ScriptElementCrewAssignment] = []
    conditional_rules: List[ScriptElementConditionalRule] = []
    
    class Config:
        from_attributes = True
    
    @model_validator(mode='before')
    @classmethod
    def populate_department_fields(cls, data):
        """Populate department name, color, and initials from department relationship"""
        if hasattr(data, 'department') and data.department:
            # If this is a SQLAlchemy model instance with department relationship
            data.departmentName = data.department.departmentName
            data.departmentColor = data.department.departmentColor
            data.departmentInitials = data.department.departmentInitials
        elif isinstance(data, dict):
            # If this is already a dict, check if department data is available
            department = data.get('department')
            if department:
                data['departmentName'] = department.get('departmentName')
                data['departmentColor'] = department.get('departmentColor')
                data['departmentInitials'] = department.get('departmentInitials')
        return data

# Update the main ScriptElement schema to use enhanced version
ScriptElement = ScriptElementEnhanced

# =============================================================================
# BULK OPERATION SCHEMAS
# =============================================================================

class ScriptElementReorderItem(BaseModel):
    """Schema for individual element in reorder operation"""
    elementID: UUID
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
    is_safety_critical: Optional[bool] = None
    custom_color: Optional[str] = None

