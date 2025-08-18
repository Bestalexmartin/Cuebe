# backend/schemas/script_import.py

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum

class ElementType(str, Enum):
    CUE = "CUE"
    NOTE = "NOTE"
    GROUP = "GROUP"

class PriorityLevel(str, Enum):
    SAFETY = "SAFETY"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    OPTIONAL = "OPTIONAL"

class ScriptStatus(str, Enum):
    DRAFT = "DRAFT"
    COPY = "COPY"
    WORKING = "WORKING"
    FINAL = "FINAL"

# Import request schemas
class ScriptMetadataImport(BaseModel):
    """Script metadata for import"""
    script_name: str = Field(..., min_length=1, max_length=200)
    script_status: ScriptStatus = ScriptStatus.DRAFT
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    script_notes: Optional[str] = Field(None, max_length=1000)

class ScriptElementImport(BaseModel):
    """Individual script element for import"""
    # Core element data
    element_type: ElementType
    element_name: str = Field(..., min_length=1, max_length=200)
    cue_notes: Optional[str] = Field(None, max_length=1000)
    
    # Timing information
    offset_ms: int = Field(..., ge=0)  # Non-negative milliseconds
    duration_ms: Optional[int] = Field(None, ge=0)
    sequence: Optional[int] = Field(None, ge=1)
    
    # Department association
    department_id: Optional[UUID] = None
    department_name: Optional[str] = Field(None, max_length=100)
    
    # Visual and location
    priority: PriorityLevel = PriorityLevel.NORMAL
    location_details: Optional[str] = Field(None, max_length=200)
    custom_color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    
    # Grouping (for future use)
    parent_element_id: Optional[UUID] = None
    group_level: int = Field(0, ge=0, le=10)

    @validator('offset_ms')
    def validate_offset_ms(cls, v):
        # Max 24 hours in milliseconds
        if v > 24 * 60 * 60 * 1000:
            raise ValueError('Offset cannot exceed 24 hours')
        return v

    @validator('duration_ms')
    def validate_duration_ms(cls, v):
        if v is not None and v > 24 * 60 * 60 * 1000:
            raise ValueError('Duration cannot exceed 24 hours')
        return v

class ImportMetadata(BaseModel):
    """Metadata about the import process"""
    source_file: str = Field(..., max_length=255)
    import_timestamp: datetime
    total_elements: int = Field(..., ge=0)
    warnings: Optional[List[str]] = []
    confidence_scores: Optional[Dict[str, float]] = {}
    has_group_hierarchy: Optional[bool] = False

class CleanScriptImportRequest(BaseModel):
    """Complete script import request"""
    script_metadata: ScriptMetadataImport
    script_elements: List[ScriptElementImport] = Field(..., min_items=0, max_items=1000)
    import_metadata: ImportMetadata
    show_id: UUID  # Required for creating the script

    @validator('script_elements')
    def validate_unique_sequences(cls, v):
        """Ensure sequence numbers are unique if provided"""
        sequences = [elem.sequence for elem in v if elem.sequence is not None]
        if len(sequences) != len(set(sequences)):
            raise ValueError('Sequence numbers must be unique')
        return v

# Response schemas
class ImportValidationError(BaseModel):
    """Individual validation error"""
    field: str
    message: str
    element_index: Optional[int] = None

class ImportValidationWarning(BaseModel):
    """Individual validation warning"""
    field: str
    message: str
    element_index: Optional[int] = None

class DepartmentSuggestion(BaseModel):
    """Suggested department mapping"""
    original_name: str
    suggested_department_id: Optional[UUID] = None
    suggested_department_name: Optional[str] = None
    confidence: str  # 'exact', 'alias', 'fuzzy', 'none'
    should_create_new: bool = False

class ScriptImportValidationResponse(BaseModel):
    """Response for import validation"""
    is_valid: bool
    total_elements: int
    errors: List[ImportValidationError] = []
    warnings: List[ImportValidationWarning] = []
    department_suggestions: List[DepartmentSuggestion] = []
    estimated_duration_ms: Optional[int] = None  # Based on last element timing

class ScriptImportSuccessResponse(BaseModel):
    """Response for successful script import"""
    script_id: UUID
    elements_created: int
    departments_created: int
    warnings: List[str] = []
    import_metadata: ImportMetadata

class ScriptImportErrorResponse(BaseModel):
    """Response for failed script import"""
    error: str
    details: Optional[Dict[str, Any]] = {}
    validation_errors: List[ImportValidationError] = []