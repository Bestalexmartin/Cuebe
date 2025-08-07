"""
Script sharing API endpoints for secure crew access to read-only script views
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

from database import get_db
from models import ScriptShare, Script, User, ScriptElement, Department, Show, Venue, CrewAssignment
from routers.auth import get_current_user, get_current_user_optional
import schemas
from schemas import (
    ScriptShareCreate,
    ScriptShareUpdate, 
    ScriptShareResponse,
    ScriptShareListResponse,
    SharedScriptAccessResponse,
    TokenValidationResponse,
    ShareUsageUpdate
)
from utils.script_sharing_utils import ScriptShareUtils
from middleware.script_sharing_auth import ShareTokenValidator, ShareAccessLogger

router = APIRouter(prefix="/api", tags=["script-sharing"])

# Use utility function for token generation instead of local function

def validate_script_ownership(script_id: UUID, current_user: User, db: Session) -> Script:
    """Validate that the current user owns the script"""
    script = db.query(Script).filter(Script.script_id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if script.owner_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only script owners can manage sharing")
    
    return script

@router.post("/scripts/{script_id}/share", response_model=ScriptShareResponse)
async def create_script_share(
    script_id: UUID,
    share_data: ScriptShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new script share with specified permissions and department filtering"""
    
    # Validate ownership
    script = validate_script_ownership(script_id, current_user, db)
    
    # Generate unique token using utility
    share_token = ScriptShareUtils.ensure_unique_token(db)
    
    # Verify the user is assigned to the show
    crew_assignment = db.query(CrewAssignment).filter(
        and_(
            CrewAssignment.user_id == share_data.shared_with_user_id,
            CrewAssignment.show_id == script.show_id,
            CrewAssignment.is_active == True
        )
    ).first()
    
    if not crew_assignment:
        raise HTTPException(
            status_code=400, 
            detail="User is not assigned to this show's crew"
        )
    
    # Check if share already exists for this user
    existing_share = db.query(ScriptShare).filter(
        and_(
            ScriptShare.script_id == script_id,
            ScriptShare.shared_with_user_id == share_data.shared_with_user_id,
            ScriptShare.is_active == True
        )
    ).first()
    
    if existing_share:
        raise HTTPException(
            status_code=400,
            detail="An active share already exists for this crew member"
        )
    
    # Create share record
    script_share = ScriptShare(
        script_id=script_id,
        created_by=current_user.user_id,
        shared_with_user_id=share_data.shared_with_user_id,
        share_token=share_token,
        permissions=share_data.permissions,
        expires_at=share_data.expires_at,
        share_name=share_data.share_name,
        notes=share_data.notes
    )
    
    db.add(script_share)
    db.commit()
    db.refresh(script_share)
    
    # Load the shared_with_user relationship for response
    script_share_with_user = db.query(ScriptShare).options(
        joinedload(ScriptShare.shared_with_user)
    ).filter(ScriptShare.share_id == script_share.share_id).first()
    
    # Manually construct response data with computed fields
    is_expired = script_share_with_user.expires_at is not None and script_share_with_user.expires_at <= datetime.now(timezone.utc)
    
    share_data = {
        "share_id": script_share_with_user.share_id,
        "script_id": script_share_with_user.script_id,
        "created_by": script_share_with_user.created_by,
        "shared_with_user_id": script_share_with_user.shared_with_user_id,
        "share_token": script_share_with_user.share_token,
        "permissions": script_share_with_user.permissions or {"view": True, "download": False},
        "expires_at": script_share_with_user.expires_at,
        "is_active": script_share_with_user.is_active,
        "access_count": script_share_with_user.access_count,
        "last_accessed_at": script_share_with_user.last_accessed_at,
        "last_accessed_by_ip": script_share_with_user.last_accessed_by_ip,
        "share_name": script_share_with_user.share_name,
        "notes": script_share_with_user.notes,
        "date_created": script_share_with_user.date_created,
        "date_updated": script_share_with_user.date_updated,
        # Computed fields
        "shared_with_user_name": f"{script_share_with_user.shared_with_user.fullname_first} {script_share_with_user.shared_with_user.fullname_last}" if script_share_with_user.shared_with_user else None,
        "shared_with_user_email": script_share_with_user.shared_with_user.email_address if script_share_with_user.shared_with_user else None,
        "is_expired": is_expired,
        "share_url": f"http://localhost:5173/shared/{script_share_with_user.share_token}"  # TODO: Get from config
    }
    
    return ScriptShareResponse(**share_data)

@router.get("/scripts/{script_id}/shares", response_model=ScriptShareListResponse)
async def list_script_shares(
    script_id: UUID,
    active_only: bool = Query(True, description="Only return active (non-revoked) shares"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all shares for a script (owner only)"""
    
    # Validate ownership
    validate_script_ownership(script_id, current_user, db)
    
    # Query shares with user relationship loaded
    query = db.query(ScriptShare).options(
        joinedload(ScriptShare.shared_with_user)
    ).filter(ScriptShare.script_id == script_id)
    
    if active_only:
        query = query.filter(
            and_(
                ScriptShare.is_active == True,
                or_(
                    ScriptShare.expires_at == None,
                    ScriptShare.expires_at > datetime.now(timezone.utc)
                )
            )
        )
    
    shares = query.order_by(ScriptShare.date_created.desc()).all()
    
    # Calculate counts
    total_count = len(shares)
    active_count = sum(1 for share in shares if share.is_active and (
        share.expires_at is None or share.expires_at > datetime.now(timezone.utc)
    ))
    expired_count = sum(1 for share in shares if share.expires_at and share.expires_at <= datetime.now(timezone.utc))
    
    # Convert to response format with computed fields
    share_responses = []
    for share in shares:
        is_expired = share.expires_at is not None and share.expires_at <= datetime.now(timezone.utc)
        
        share_data = {
            "share_id": share.share_id,
            "script_id": share.script_id,
            "created_by": share.created_by,
            "shared_with_user_id": share.shared_with_user_id,
            "share_token": share.share_token,
            "permissions": share.permissions or {"view": True, "download": False},
            "expires_at": share.expires_at,
            "is_active": share.is_active,
            "access_count": share.access_count,
            "last_accessed_at": share.last_accessed_at,
            "last_accessed_by_ip": share.last_accessed_by_ip,
            "share_name": share.share_name,
            "notes": share.notes,
            "date_created": share.date_created,
            "date_updated": share.date_updated,
            # Computed fields
            "shared_with_user_name": f"{share.shared_with_user.fullname_first} {share.shared_with_user.fullname_last}" if share.shared_with_user else None,
            "shared_with_user_email": share.shared_with_user.email_address if share.shared_with_user else None,
            "is_expired": is_expired,
            "share_url": f"http://localhost:5173/shared/{share.share_token}"  # TODO: Get from config
        }
        share_responses.append(ScriptShareResponse(**share_data))
    
    return ScriptShareListResponse(
        shares=share_responses,
        total_count=total_count,
        active_count=active_count,
        expired_count=expired_count
    )

@router.put("/scripts/{script_id}/shares/{token}", response_model=ScriptShareResponse)
async def update_script_share(
    script_id: UUID,
    token: str,
    share_update: ScriptShareUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing script share (owner only)"""
    
    # Validate ownership
    validate_script_ownership(script_id, current_user, db)
    
    # Find the share
    script_share = db.query(ScriptShare).filter(
        and_(
            ScriptShare.script_id == script_id,
            ScriptShare.share_token == token
        )
    ).first()
    
    if not script_share:
        raise HTTPException(status_code=404, detail="Script share not found")
    
    # Update fields
    if share_update.permissions is not None:
        script_share.permissions = share_update.permissions
    if share_update.expires_at is not None:
        script_share.expires_at = share_update.expires_at
    if share_update.is_active is not None:
        script_share.is_active = share_update.is_active
    if share_update.share_name is not None:
        script_share.share_name = share_update.share_name
    if share_update.notes is not None:
        script_share.notes = share_update.notes
    
    script_share.date_updated = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(script_share)
    
    # Load the shared_with_user relationship for response
    script_share_with_user = db.query(ScriptShare).options(
        joinedload(ScriptShare.shared_with_user)
    ).filter(ScriptShare.share_id == script_share.share_id).first()
    
    # Manually construct response data with computed fields
    is_expired = script_share_with_user.expires_at is not None and script_share_with_user.expires_at <= datetime.now(timezone.utc)
    
    share_data = {
        "share_id": script_share_with_user.share_id,
        "script_id": script_share_with_user.script_id,
        "created_by": script_share_with_user.created_by,
        "shared_with_user_id": script_share_with_user.shared_with_user_id,
        "share_token": script_share_with_user.share_token,
        "permissions": script_share_with_user.permissions or {"view": True, "download": False},
        "expires_at": script_share_with_user.expires_at,
        "is_active": script_share_with_user.is_active,
        "access_count": script_share_with_user.access_count,
        "last_accessed_at": script_share_with_user.last_accessed_at,
        "last_accessed_by_ip": script_share_with_user.last_accessed_by_ip,
        "share_name": script_share_with_user.share_name,
        "notes": script_share_with_user.notes,
        "date_created": script_share_with_user.date_created,
        "date_updated": script_share_with_user.date_updated,
        # Computed fields
        "shared_with_user_name": f"{script_share_with_user.shared_with_user.fullname_first} {script_share_with_user.shared_with_user.fullname_last}" if script_share_with_user.shared_with_user else None,
        "shared_with_user_email": script_share_with_user.shared_with_user.email_address if script_share_with_user.shared_with_user else None,
        "is_expired": is_expired,
        "share_url": f"http://localhost:5173/shared/{script_share_with_user.share_token}"  # TODO: Get from config
    }
    
    return ScriptShareResponse(**share_data)

@router.delete("/scripts/{script_id}/shares/{token}")
async def revoke_script_share(
    script_id: UUID,
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke (deactivate) a script share (owner only)"""
    
    # Validate ownership
    validate_script_ownership(script_id, current_user, db)
    
    # Find the share
    script_share = db.query(ScriptShare).filter(
        and_(
            ScriptShare.script_id == script_id,
            ScriptShare.share_token == token
        )
    ).first()
    
    if not script_share:
        raise HTTPException(status_code=404, detail="Script share not found")
    
    # Deactivate instead of deleting for audit trail
    script_share.is_active = False
    script_share.date_updated = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Script share revoked successfully"}

@router.get("/shared-scripts/{token}/validate", response_model=TokenValidationResponse)
async def validate_share_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Validate a share token and return basic info (public endpoint)"""
    
    # Find the share
    script_share = db.query(ScriptShare).filter(ScriptShare.share_token == token).first()
    
    if not script_share:
        return TokenValidationResponse(
            is_valid=False,
            error_message="Invalid or expired sharing token"
        )
    
    # Check if share is active
    if not script_share.is_active:
        return TokenValidationResponse(
            is_valid=False,
            error_message="This sharing link has been revoked"
        )
    
    # Check expiration
    if script_share.expires_at and script_share.expires_at <= datetime.now(timezone.utc):
        return TokenValidationResponse(
            is_valid=False,
            error_message="This sharing link has expired"
        )
    
    return TokenValidationResponse(
        is_valid=True,
        script_id=script_share.script_id,
        shared_with_user_id=script_share.shared_with_user_id,
        permissions=script_share.permissions,
        expires_at=script_share.expires_at
    )

@router.get("/shared-scripts/{token}", response_model=SharedScriptAccessResponse)
async def access_shared_script(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Access a shared script using a token (public endpoint with optional auth)"""
    
    # Validate token using middleware utility
    try:
        share_info = ShareTokenValidator.validate_token(token, db)
        script_share = share_info["share"]
        script = share_info["script"]
        permissions = share_info["permissions"]
    except HTTPException:
        # Log failed access attempt
        ShareAccessLogger.log_access(token, request, 
                                   user_id=str(current_user.user_id) if current_user else None,
                                   success=False, error_message="Invalid or expired token")
        raise
    
    # Update access tracking using utility
    ShareTokenValidator.update_access_tracking(
        token, request, db, 
        user_id=str(current_user.user_id) if current_user else None
    )
    
    # Log successful access
    ShareAccessLogger.log_access(token, request,
                               user_id=str(current_user.user_id) if current_user else None,
                               success=True)
    
    # Get the crew member's department assignments for this show
    shared_user = script_share.shared_with_user
    crew_assignments = db.query(CrewAssignment).filter(
        and_(
            CrewAssignment.user_id == shared_user.user_id,
            CrewAssignment.show_id == script.show_id,
            CrewAssignment.is_active == True
        )
    ).all()
    
    # Get list of department IDs this user is assigned to
    user_department_ids = [assignment.department_id for assignment in crew_assignments]
    
    # Get script elements filtered by user's departments (or no department assignment)
    elements_query = db.query(ScriptElement).filter(
        and_(
            ScriptElement.script_id == script.script_id,
            ScriptElement.is_active == True,
            or_(
                ScriptElement.department_id.in_(user_department_ids),
                ScriptElement.department_id.is_(None)  # Include elements with no department (general notes)
            )
        )
    )
    
    elements = elements_query.order_by(ScriptElement.sequence.asc()).all()
    
    # Convert elements to dictionaries with department info
    element_dicts = []
    for element in elements:
        element_dict = {
            "element_id": str(element.element_id),
            "element_type": element.element_type.value if element.element_type else None,
            "sequence": element.sequence,
            "cue_id": element.cue_id,
            "description": element.description,
            "cue_notes": element.cue_notes,
            "time_offset_ms": element.time_offset_ms,
            "department_id": str(element.department_id) if element.department_id else None,
            "location": element.location.value if element.location else None,
            "location_details": element.location_details,
            "priority": element.priority.value if element.priority else None,
            "trigger_type": element.trigger_type.value if element.trigger_type else None
        }
        element_dicts.append(element_dict)
    
    # Get department information for this user's assignments
    departments_info = None
    if user_department_ids:
        departments = db.query(Department).filter(
            Department.department_id.in_(user_department_ids)
        ).all()
        departments_info = [
            {
                "department_id": str(dept.department_id),
                "department_name": dept.department_name,
                "department_color": dept.department_color,
                "department_initials": dept.department_initials
            }
            for dept in departments
        ]
    
    # Commit the access tracking updates
    db.commit()
    
    return SharedScriptAccessResponse(
        script_id=script.script_id,
        script_name=script.script_name,
        script_status=script.script_status.value if script.script_status else "DRAFT",
        show_name=script.show.show_name if script.show else None,
        venue_name=script.show.venue.venue_name if script.show and script.show.venue else None,
        start_time=script.start_time,
        end_time=script.end_time,
        elements=element_dicts,
        departments=departments_info,
        permissions=permissions,
        last_updated=script.date_updated,
        share_name=script_share.share_name,
        expires_at=script_share.expires_at
    )

@router.post("/scripts/{script_id}/shares/{token}/regenerate", response_model=ScriptShareResponse)
async def regenerate_share_token(
    script_id: UUID,
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate a new token for an existing share (owner only)"""
    
    # Validate ownership
    validate_script_ownership(script_id, current_user, db)
    
    # Find the share
    script_share = db.query(ScriptShare).filter(
        and_(
            ScriptShare.script_id == script_id,
            ScriptShare.share_token == token
        )
    ).first()
    
    if not script_share:
        raise HTTPException(status_code=404, detail="Script share not found")
    
    # Generate new unique token using utility
    new_token = ScriptShareUtils.ensure_unique_token(db)
    
    # Update the share
    script_share.share_token = new_token
    script_share.date_updated = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(script_share)
    
    # Load the shared_with_user relationship for response
    script_share_with_user = db.query(ScriptShare).options(
        joinedload(ScriptShare.shared_with_user)
    ).filter(ScriptShare.share_id == script_share.share_id).first()
    
    # Manually construct response data with computed fields
    is_expired = script_share_with_user.expires_at is not None and script_share_with_user.expires_at <= datetime.now(timezone.utc)
    
    share_data = {
        "share_id": script_share_with_user.share_id,
        "script_id": script_share_with_user.script_id,
        "created_by": script_share_with_user.created_by,
        "shared_with_user_id": script_share_with_user.shared_with_user_id,
        "share_token": script_share_with_user.share_token,
        "permissions": script_share_with_user.permissions or {"view": True, "download": False},
        "expires_at": script_share_with_user.expires_at,
        "is_active": script_share_with_user.is_active,
        "access_count": script_share_with_user.access_count,
        "last_accessed_at": script_share_with_user.last_accessed_at,
        "last_accessed_by_ip": script_share_with_user.last_accessed_by_ip,
        "share_name": script_share_with_user.share_name,
        "notes": script_share_with_user.notes,
        "date_created": script_share_with_user.date_created,
        "date_updated": script_share_with_user.date_updated,
        # Computed fields
        "shared_with_user_name": f"{script_share_with_user.shared_with_user.fullname_first} {script_share_with_user.shared_with_user.fullname_last}" if script_share_with_user.shared_with_user else None,
        "shared_with_user_email": script_share_with_user.shared_with_user.email_address if script_share_with_user.shared_with_user else None,
        "is_expired": is_expired,
        "share_url": f"http://localhost:5173/shared/{script_share_with_user.share_token}"  # TODO: Get from config
    }
    
    return ScriptShareResponse(**share_data)

@router.delete("/scripts/{script_id}/shares")
async def revoke_all_script_shares(
    script_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke all shares for a script (owner only)"""
    
    # Validate ownership
    validate_script_ownership(script_id, current_user, db)
    
    # Update all active shares for this script
    updated_count = db.query(ScriptShare).filter(
        and_(
            ScriptShare.script_id == script_id,
            ScriptShare.is_active == True
        )
    ).update({
        ScriptShare.is_active: False,
        ScriptShare.date_updated: datetime.now(timezone.utc)
    })
    
    db.commit()
    
    return {"message": f"Revoked {updated_count} script shares successfully"}