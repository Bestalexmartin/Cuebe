# backend/schemas/script_element.py

from pydantic import BaseModel, model_validator
from datetime import datetime
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .script import Script

# =============================================================================
# SCRIPT ELEMENT SCHEMAS
# =============================================================================

class ScriptElementFromDB(BaseModel):
    """Schema for script elements coming FROM the database"""
    element_id: UUID
    script_id: UUID

    class Config:
        from_attributes = True

class ScriptElement(BaseModel):
    """Schema for script elements going TO the frontend"""
    element_id: UUID
    script_id: UUID
    element_type: str
    sequence: Optional[int] = None
    
    # Timing fields
    offset_ms: int = 0  # Timing in milliseconds
    duration_ms: Optional[int] = None
    priority: str = "normal"
    
    # Content
    element_name: str = ""
    cue_notes: Optional[str] = None
    
    # Location and visual
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None  # Computed from department relationship
    department_initials: Optional[str] = None  # Computed from department relationship
    department_color: Optional[str] = None  # Computed from department relationship
    location_details: Optional[str] = None
    custom_color: Optional[str] = None
    
    # Grouping and hierarchy
    parent_element_id: Optional[UUID] = None
    group_level: int = 0
    is_collapsed: bool = False
    
    # System fields
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    date_created: datetime
    date_updated: datetime

    class Config:
        from_attributes = True
    
    @model_validator(mode='before')
    @classmethod
    def populate_department_fields(cls, data):
        """Populate department name, initials, and color from department relationship"""
        if hasattr(data, 'department') and data.department:
            # If this is a SQLAlchemy model instance with department relationship
            data.department_name = data.department.department_name
            data.department_initials = data.department.department_initials
            data.department_color = data.department.department_color
        elif isinstance(data, dict):
            # If this is already a dict, check if department data is available
            department = data.get('department')
            if department:
                data['department_name'] = department.get('department_name')
                data['department_initials'] = department.get('department_initials')
                data['department_color'] = department.get('department_color')
        return data

# =============================================================================
# CREATE/UPDATE SCHEMAS
# =============================================================================

class ScriptElementCreate(BaseModel):
    """Schema for creating new script elements"""
    element_type: str  # 'CUE', 'NOTE'
    sequence: Optional[int] = None  # Auto-calculated if not provided
    offset_ms: Optional[int] = 0  # Time offset in milliseconds
    element_name: str = ""
    cue_notes: Optional[str] = None
    department_id: Optional[UUID] = None
    location_details: Optional[str] = None
    duration_ms: Optional[int] = None  # Duration in milliseconds
    priority: Optional[str] = "NORMAL"  # 'SAFETY', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'OPTIONAL'
    parent_element_id: Optional[UUID] = None  # For grouped elements
    group_level: Optional[int] = 0
    custom_color: Optional[str] = None  # Custom color for element

class ScriptElementUpdate(BaseModel):
    """Schema for updating script elements"""
    element_type: Optional[str] = None
    sequence: Optional[int] = None
    offset_ms: Optional[int] = None
    element_name: Optional[str] = None
    cue_notes: Optional[str] = None
    department_id: Optional[UUID] = None
    location_details: Optional[str] = None
    duration_ms: Optional[int] = None
    priority: Optional[str] = None
    parent_element_id: Optional[UUID] = None
    group_level: Optional[int] = None
    is_collapsed: Optional[bool] = None
    custom_color: Optional[str] = None

# =============================================================================
# SHARED ACCESS SCHEMAS
# =============================================================================

class CrewContext(BaseModel):
    """Crew assignment context for shared script access"""
    department_name: Optional[str] = None
    department_initials: Optional[str] = None  
    department_color: Optional[str] = None
    show_role: Optional[str] = None
    user_name: Optional[str] = None

class SharedScriptElementsResponse(BaseModel):
    """Response schema for shared script elements with crew context and script metadata"""
    elements: List[ScriptElement]
    crew_context: Optional[CrewContext] = None
    script: Optional['Script'] = None
    
    class Config:
        from_attributes = True