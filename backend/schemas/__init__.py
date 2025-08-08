# backend/schemas/__init__.py
# 
# Import all schemas for backwards compatibility with existing imports
# e.g., `from schemas import User, Script, ScriptElement`

# User schemas
from .user import (
    User,
    CrewMemberCreate,
    GuestUserCreate,
    CrewRelationshipCreate,
    CrewMemberWithRelationship,
)

# Venue schemas
from .venue import (
    VenueBase,
    VenueCreate,
    Venue,
)

# Department schemas
from .department import (
    DepartmentCreate,
    Department,
)

# Show schemas
from .show import (
    ShowCreate,
    CrewAssignment,
    CrewAssignmentCreate,
    CrewAssignmentBulkRequest,
    CrewMemberWithDetails,
    Show,
)

# Script schemas
from .script import (
    ScriptCreate,
    Script,
    ScriptUpdate,
)

# Script element schemas
from .script_element import (
    ScriptElementFromDB,
    ScriptElement,
    ScriptElementCreate,
    ScriptElementUpdate,
    ScriptElementEnhanced,
)

# Operation schemas
from .operations import (
    ScriptElementReorderItem,
    ScriptElementReorderRequest,
    ScriptElementBulkUpdate,
    EditQueueOperation,
    ReorderEditOperation,
    UpdateFieldEditOperation,
    UpdateTimeOffsetEditOperation,
    CreateElementEditOperation,
    DeleteElementEditOperation,
    BulkReorderEditOperation,
    EditQueueBatchRequest,
)

# Sharing schemas
from .sharing import (
    ScriptShareCreate,
    ScriptShareUpdate,
    ScriptShareResponse,
    ScriptShareListResponse,
    SharedScriptAccessResponse,
    TokenValidationResponse,
    ShareUsageUpdate,
)

__all__ = [
    # User schemas
    "User",
    "CrewMemberCreate", 
    "GuestUserCreate",
    "CrewRelationshipCreate",
    "CrewMemberWithRelationship",
    
    # Venue schemas
    "VenueBase",
    "VenueCreate",
    "Venue",
    
    # Department schemas
    "DepartmentCreate",
    "Department",
    
    # Show schemas
    "ShowCreate",
    "CrewAssignment",
    "CrewAssignmentCreate",
    "CrewAssignmentBulkRequest",
    "CrewMemberWithDetails",
    "Show",
    
    # Script schemas
    "ScriptCreate",
    "Script",
    "ScriptUpdate",
    
    # Script element schemas
    "ScriptElementFromDB",
    "ScriptElement", 
    "ScriptElementCreate",
    "ScriptElementUpdate",
    "ScriptElementEnhanced",
    
    # Operation schemas
    "ScriptElementReorderItem",
    "ScriptElementReorderRequest",
    "ScriptElementBulkUpdate",
    "EditQueueOperation",
    "ReorderEditOperation",
    "UpdateFieldEditOperation",
    "UpdateTimeOffsetEditOperation",
    "CreateElementEditOperation",
    "DeleteElementEditOperation",
    "BulkReorderEditOperation",
    "EditQueueBatchRequest",
    
    # Sharing schemas
    "ScriptShareCreate",
    "ScriptShareUpdate",
    "ScriptShareResponse",
    "ScriptShareListResponse",
    "SharedScriptAccessResponse",
    "TokenValidationResponse",
    "ShareUsageUpdate",
]

# Rebuild models to resolve forward references
Show.model_rebuild()
Script.model_rebuild()