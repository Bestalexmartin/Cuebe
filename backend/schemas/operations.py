# backend/schemas/operations.py

from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional, Any

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