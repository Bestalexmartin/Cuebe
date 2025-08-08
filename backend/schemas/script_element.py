# backend/schemas/script_element.py

from pydantic import BaseModel, model_validator
from datetime import datetime
from uuid import UUID
from typing import Optional

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