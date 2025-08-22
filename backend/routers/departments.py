# backend/routers/departments.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct
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


@router.get("/me/departments", response_model=list[schemas.DepartmentWithStats])
def read_departments(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get departments owned by the current user with statistics."""
    departments = db.query(models.Department).filter(models.Department.owner_id == user.user_id).all()
    
    departments_with_stats = []
    for dept in departments:
        # Calculate shows assigned count (distinct shows this department is assigned to)
        shows_assigned_count = db.query(func.count(distinct(models.CrewAssignment.show_id))).filter(
            models.CrewAssignment.department_id == dept.department_id
        ).scalar() or 0
        
        # Get crew assignments with user and show details
        crew_assignments = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.department_id == dept.department_id
        ).options(
            joinedload(models.CrewAssignment.user),
            joinedload(models.CrewAssignment.show)
        ).all()
        
        # Format crew assignments for response
        assignment_list = []
        for assignment in crew_assignments:
            # Construct share URL from share token
            share_url = None
            if assignment.share_token:
                share_url = f"/share/{assignment.share_token}"
            
            assignment_data = {
                "assignment_id": assignment.assignment_id,
                "show_id": assignment.show_id,
                "show_name": assignment.show.show_name if assignment.show else "Unknown Show",
                "user_id": assignment.user_id,
                "fullname_first": assignment.user.fullname_first if assignment.user else None,
                "fullname_last": assignment.user.fullname_last if assignment.user else None,
                "email_address": assignment.user.email_address if assignment.user else None,
                "phone_number": assignment.user.phone_number if assignment.user else None,
                "profile_img_url": assignment.user.profile_img_url if assignment.user else None,
                "role": assignment.show_role,
                "user_role": assignment.user.user_role if assignment.user else None,
                "user_status": assignment.user.user_status if assignment.user else None,
                "is_active": assignment.user.is_active if assignment.user else None,
                "date_created": assignment.user.date_created if assignment.user else None,
                "date_updated": assignment.user.date_updated if assignment.user else None,
                "share_url": share_url
            }
            assignment_list.append(schemas.DepartmentCrewAssignment(**assignment_data))
        
        # Create department with stats
        dept_dict = {
            "department_id": dept.department_id,
            "department_name": dept.department_name,
            "department_description": dept.department_description,
            "department_color": dept.department_color,
            "department_initials": dept.department_initials,
            "date_created": dept.date_created,
            "date_updated": dept.date_updated,
            "shows_assigned_count": shows_assigned_count,
            "unique_crew_count": 0,  # Not needed but keeping for schema compatibility
            "crew_assignments": assignment_list
        }
        departments_with_stats.append(schemas.DepartmentWithStats(**dept_dict))
    
    return departments_with_stats


@router.post("/me/departments", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
def create_department(
    department: schemas.DepartmentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department owned by the current user."""
    new_department = models.Department(
        department_name=department.department_name,
        department_description=department.department_description,
        department_color=department.department_color,
        department_initials=department.department_initials,
        owner_id=user.user_id
    )
    db.add(new_department)
    db.commit()
    db.refresh(new_department)
    return new_department


@router.get("/departments/{department_id}", response_model=schemas.Department)
def read_department(
    department_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single department by ID (must be owned by current user)."""
    department = db.query(models.Department).filter(
        models.Department.department_id == department_id,
        models.Department.owner_id == user.user_id
    ).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department


@router.patch("/departments/{department_id}", response_model=schemas.Department)
def update_department(
    department_id: UUID,
    department_update: schemas.DepartmentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a department."""
    department_to_update = db.query(models.Department).filter(
        models.Department.department_id == department_id,
        models.Department.owner_id == user.user_id
    ).first()
    if not department_to_update:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = department_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(department_to_update, key, value)
    
    # Update the date_updated timestamp
    department_to_update.date_updated = datetime.utcnow()
    
    db.commit()
    db.refresh(department_to_update)
    
    return department_to_update


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a department after checking for dependencies."""
    department_to_delete = db.query(models.Department).filter(
        models.Department.department_id == department_id,
        models.Department.owner_id == user.user_id
    ).first()
    if not department_to_delete:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check for dependent records that would prevent deletion
    crew_assignments = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.department_id == department_id
    ).count()
    
    script_elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.department_id == department_id
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