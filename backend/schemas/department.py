# backend/schemas/department.py

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, List

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

class DepartmentCrewAssignment(BaseModel):
    """Crew assignment info for department display"""
    assignment_id: UUID
    show_id: UUID
    show_name: str
    user_id: UUID
    fullname_first: Optional[str] = None
    fullname_last: Optional[str] = None
    email_address: Optional[str] = None
    phone_number: Optional[str] = None
    profile_img_url: Optional[str] = None
    role: Optional[str] = None
    user_role: Optional[str] = None
    user_status: Optional[str] = None
    is_active: Optional[bool] = None
    date_created: Optional[datetime] = None
    date_updated: Optional[datetime] = None

class DepartmentWithStats(Department):
    """Department with calculated statistics and crew assignments"""
    shows_assigned_count: int = 0
    unique_crew_count: int = 0
    crew_assignments: List[DepartmentCrewAssignment] = []