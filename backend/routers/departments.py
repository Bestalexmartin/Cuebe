# backend/routers/departments.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

# Optional rate limiting import
try:
    from utils.rate_limiter import limiter, RateLimitConfig
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    limiter = None
    RateLimitConfig = None
    RATE_LIMITING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["departments"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


@router.get("/me/departments", response_model=list[schemas.Department])
async def read_departments(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get departments owned by the current user."""
    departments = db.query(models.Department).filter(models.Department.ownerID == user.userID).all()
    return departments


@router.post("/me/departments", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: schemas.DepartmentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department owned by the current user."""
    new_department = models.Department(
        departmentName=department.departmentName,
        departmentDescription=department.departmentDescription,
        departmentColor=department.departmentColor,
        ownerID=user.userID
    )
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    return new_department


@router.get("/departments/{department_id}", response_model=schemas.Department)
async def read_department(
    department_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single department by ID (must be owned by current user)."""
    department = db.query(models.Department).filter(
        models.Department.departmentID == department_id,
        models.Department.ownerID == user.userID
    ).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.patch("/departments/{department_id}", response_model=schemas.Department)
async def update_department(
    department_id: UUID,
    department_update: schemas.DepartmentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a department."""
    department_to_update = db.query(models.Department).filter(
        models.Department.departmentID == department_id,
        models.Department.ownerID == user.userID
    ).first()
    if not department_to_update:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = department_update.model_dump(exclude_unset=True)
    logger.info(f"Updating department {department_id} with data: {update_data}")

    for key, value in update_data.items():
        setattr(department_to_update, key, value)
    
    # Update the dateUpdated timestamp
    department_to_update.dateUpdated = datetime.utcnow() # type: ignore
    
    db.commit()
    db.refresh(department_to_update)
    
    return department_to_update


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a department after checking for dependencies."""
    department_to_delete = db.query(models.Department).filter(
        models.Department.departmentID == department_id,
        models.Department.ownerID == user.userID
    ).first()
    if not department_to_delete:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check for dependent records that would prevent deletion
    crew_assignments = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.departmentID == department_id
    ).count()
    
    script_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.departmentID == department_id
    ).count()
    
    # If there are dependencies, prevent deletion and inform user
    dependencies = []
    if crew_assignments > 0:
        dependencies.append(f"{crew_assignments} crew assignment(s)")
    if script_elements > 0:
        dependencies.append(f"{script_elements} script element(s)")
    
    if dependencies:
        dependency_list = ", ".join(dependencies)
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete department. It is still referenced by: {dependency_list}. Please remove these references first."
        )

    # Safe to delete - no dependencies
    db.delete(department_to_delete)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)