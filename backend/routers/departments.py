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
    
    # Single efficient query with all stats calculated at database level
    departments_with_stats = db.query(
        models.Department,
        func.count(distinct(models.CrewAssignment.show_id)).label('shows_assigned_count'),
        func.count(distinct(models.ScriptElement.element_id)).label('script_elements_count'),
        func.count(distinct(models.CrewAssignment.user_id)).label('unique_crew_count')
    ).outerjoin(
        models.CrewAssignment, models.Department.department_id == models.CrewAssignment.department_id
    ).outerjoin(
        models.ScriptElement, models.Department.department_id == models.ScriptElement.department_id
    ).filter(
        models.Department.owner_id == user.user_id
    ).group_by(models.Department.department_id).all()
    
    # Get crew assignments for all departments in one query
    dept_ids = [dept.department_id for dept, *_ in departments_with_stats]
    if dept_ids:
        all_crew_assignments = db.query(models.CrewAssignment).filter(
            models.CrewAssignment.department_id.in_(dept_ids)
        ).options(
            joinedload(models.CrewAssignment.user),
            joinedload(models.CrewAssignment.show)
        ).all()
    else:
        all_crew_assignments = []
    
    # Group assignments by department
    assignments_by_dept = {}
    for assignment in all_crew_assignments:
        dept_id = assignment.department_id
        if dept_id not in assignments_by_dept:
            assignments_by_dept[dept_id] = []
        
        # Use Pydantic serialization with computed share_url
        assignment_dict = assignment.__dict__.copy()
        assignment_dict['show_name'] = assignment.show.show_name if assignment.show else "Unknown Show"
        assignment_dict['fullname_first'] = assignment.user.fullname_first if assignment.user else None
        assignment_dict['fullname_last'] = assignment.user.fullname_last if assignment.user else None
        assignment_dict['email_address'] = assignment.user.email_address if assignment.user else None
        assignment_dict['phone_number'] = assignment.user.phone_number if assignment.user else None
        assignment_dict['profile_img_url'] = assignment.user.profile_img_url if assignment.user else None
        assignment_dict['role'] = assignment.show_role
        assignment_dict['user_role'] = assignment.user.user_role if assignment.user else None
        assignment_dict['user_status'] = assignment.user.user_status if assignment.user else None
        assignment_dict['is_active'] = assignment.user.is_active if assignment.user else None
        assignment_dict['date_created'] = assignment.user.date_created if assignment.user else None
        assignment_dict['date_updated'] = assignment.user.date_updated if assignment.user else None
        assignment_dict['share_url'] = f"/share/{assignment.share_token}" if assignment.share_token else None
        
        assignments_by_dept[dept_id].append(schemas.DepartmentCrewAssignment(**assignment_dict))
    
    # Build final response
    result = []
    for dept, shows_count, elements_count, unique_count in departments_with_stats:
        dept_dict = dept.__dict__.copy()
        dept_dict['shows_assigned_count'] = shows_count or 0
        dept_dict['script_elements_count'] = elements_count or 0
        dept_dict['unique_crew_count'] = unique_count or 0
        dept_dict['crew_assignments'] = assignments_by_dept.get(dept.department_id, [])
        
        result.append(schemas.DepartmentWithStats(**dept_dict))
    
    return result


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
    logger.info(f"🗑️ DELETE request for department {department_id} by user {user.user_id}")
    
    department_to_delete = db.query(models.Department).filter(
        models.Department.department_id == department_id,
        models.Department.owner_id == user.user_id
    ).first()
    if not department_to_delete:
        logger.warning(f"❌ Department {department_id} not found for user {user.user_id}")
        raise HTTPException(status_code=404, detail="Department not found")

    logger.info(f"📋 Found department: {department_to_delete.department_name}")

    # Check for dependent records that would prevent deletion (efficient counts + samples)
    crew_count = db.query(func.count()).select_from(models.CrewAssignment).filter(
        models.CrewAssignment.department_id == department_id
    ).scalar() or 0

    script_element_count = db.query(func.count()).select_from(models.ScriptElement).filter(
        models.ScriptElement.department_id == department_id
    ).scalar() or 0

    logger.info(f"🔍 Dependency check results:")
    logger.info(f"   - Crew assignments: {crew_count}")
    logger.info(f"   - Script elements: {script_element_count}")

    # Sample some names for better error reporting (limit to 3)
    show_name_rows = []
    if crew_count:
        show_name_rows = (
            db.query(models.Show.show_name)
            .join(models.CrewAssignment, models.CrewAssignment.show_id == models.Show.show_id)
            .filter(models.CrewAssignment.department_id == department_id)
            .distinct()
            .limit(3)
            .all()
        )

    script_name_rows = []
    if script_element_count:
        script_name_rows = (
            db.query(models.Script.script_name)
            .join(models.ScriptElement, models.ScriptElement.script_id == models.Script.script_id)
            .filter(models.ScriptElement.department_id == department_id)
            .distinct()
            .limit(3)
            .all()
        )
    
    # If there are dependencies, prevent deletion and inform user
    dependencies = []
    dependency_details = []
    
    if crew_count:
        dependencies.append(f"{crew_count} crew assignment(s)")
        show_names = [f"'{row.show_name}'" for row in show_name_rows]
        if show_names:
            dependency_details.append(f"crew assignments in shows: {', '.join(show_names)}")

    if script_element_count:
        dependencies.append(f"{script_element_count} script element(s)")
        script_names = [f"'{row.script_name}'" for row in script_name_rows]
        if script_names:
            dependency_details.append(f"script elements in scripts: {', '.join(script_names)}")
    
    if dependencies:
        dependency_summary = ", ".join(dependencies)
        detail_summary = "; ".join(dependency_details) if dependency_details else ""
        error_message = f"Cannot delete department '{department_to_delete.department_name}'. It is still referenced by: {dependency_summary}"
        if detail_summary:
            error_message += f" ({detail_summary})"
        error_message += ". Please remove these references first."
        
        logger.warning(f"🚫 Delete blocked: {error_message}")
        raise HTTPException(status_code=400, detail=error_message)

    # Safe to delete - no dependencies
    logger.info(f"✅ Deleting department '{department_to_delete.department_name}' - no dependencies found")
    db.delete(department_to_delete)
    db.commit()
    logger.info(f"🗑️ Department {department_id} successfully deleted")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
