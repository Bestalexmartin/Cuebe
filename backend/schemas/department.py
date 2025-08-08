# backend/schemas/department.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

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