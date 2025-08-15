# backend/routers/show_sharing.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import secrets
import string
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["show-sharing"])

def generate_share_token(length: int = 32) -> str:
    """Generate a secure random token for sharing"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/shows/{show_id}/crew/{user_id}/share")
async def create_or_refresh_show_share(
    show_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create or refresh a show-level sharing link for a crew member"""
    
    # Get the show and verify ownership
    show = db.query(models.Show).filter(models.Show.show_id == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    if show.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to manage this show")
    
    # Find the crew assignment for this show/user combination
    crew_assignment = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.show_id == show_id,
        models.CrewAssignment.user_id == user_id,
        models.CrewAssignment.is_active == True
    ).first()
    
    if not crew_assignment:
        raise HTTPException(status_code=404, detail="Crew assignment not found for this show and user")
    
    action = "refreshed" if crew_assignment.share_token else "created"
    
    # Generate new share token
    crew_assignment.share_token = generate_share_token()
    
    db.commit()
    db.refresh(crew_assignment)
    
    logger.info(f"{action.title()} show share token for user {user_id} on show {show_id}")
    
    return {
        "assignment_id": crew_assignment.assignment_id,
        "share_token": crew_assignment.share_token,
        "share_url": f"/shared/{crew_assignment.share_token}",
        "action": action
    }

@router.get("/shared/{share_token}")
async def access_shared_show(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Access a shared show via token (public endpoint, no auth required)"""
    
    # Find the crew assignment by share token
    crew_assignment = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.share_token == share_token,
        models.CrewAssignment.is_active == True
    ).first()
    
    if not crew_assignment:
        raise HTTPException(status_code=404, detail="Share not found or expired")
    
    # Get the show
    show = db.query(models.Show).filter(models.Show.show_id == crew_assignment.show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Get the user info
    user = db.query(models.User).filter(models.User.user_id == crew_assignment.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get the department info
    department = db.query(models.Department).filter(models.Department.department_id == crew_assignment.department_id).first()
    
    # Get all shared scripts for this show
    shared_scripts = db.query(models.Script).filter(
        models.Script.show_id == crew_assignment.show_id,
        models.Script.is_shared == True
    ).all()
    
    # Update access tracking
    crew_assignment.access_count += 1
    crew_assignment.last_accessed_at = models.func.now()
    db.commit()
    
    return {
        "show_id": show.show_id,
        "show_name": show.show_name,
        "show_date": show.show_date,
        "scripts": [
            {
                "script_id": s.script_id,
                "script_name": s.script_name,
                "script_status": s.script_status
            }
            for s in shared_scripts
        ],
        "crew_member": {
            "user_id": user.user_id,
            "name": f"{user.fullname_first} {user.fullname_last}".strip(),
            "email": user.email_address,
            "role": crew_assignment.show_role
        },
        "department": {
            "department_id": department.department_id if department else None,
            "department_name": department.department_name if department else None,
            "department_color": department.department_color if department else None
        },
        "permissions": {"view": True, "download": False}  # Default permissions
    }