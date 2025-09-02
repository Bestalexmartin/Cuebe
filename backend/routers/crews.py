# backend/routers/crews.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from uuid import UUID
from datetime import datetime, timezone
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

router = APIRouter(prefix="/api", tags=["crews"])

def rate_limit(limit_config):
    """Decorator factory that conditionally applies rate limiting"""
    def decorator(func):
        if RATE_LIMITING_AVAILABLE and limiter and limit_config:
            return limiter.limit(limit_config)(func)
        return func
    return decorator


@rate_limit(RateLimitConfig.READ_OPERATIONS if RATE_LIMITING_AVAILABLE and RateLimitConfig else None)
@router.get("/me/crews", response_model=list[schemas.CrewMemberWithRelationship])
def read_crew_members(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get crews for the current user (themselves + users they manage) with relationship data."""
    # Get crew members with relationship data in one query using LEFT JOIN
    crew_with_relationships = db.query(
        models.User,
        models.CrewRelationship.notes.label('relationship_notes')
    ).outerjoin(
        models.CrewRelationship,
        (models.CrewRelationship.manager_user_id == user.user_id) &
        (models.CrewRelationship.crew_user_id == models.User.user_id) &
        (models.CrewRelationship.is_active == True)
    ).filter(
        or_(
            models.User.user_id == user.user_id,  # Show yourself
            models.User.user_id.in_(  # Show users you manage
                db.query(models.CrewRelationship.crew_user_id)
                .filter(models.CrewRelationship.manager_user_id == user.user_id)
                .filter(models.CrewRelationship.is_active.is_(True))
            )
        )
    ).all()
    
    # Build response using Pydantic serialization
    crew_response = []
    for crew_member, relationship_notes in crew_with_relationships:
        crew_data = crew_member.__dict__.copy()
        crew_data['relationship_notes'] = relationship_notes
        crew_data['user_status'] = crew_member.user_status.value if crew_member.user_status is not None else "guest"
        crew_response.append(schemas.CrewMemberWithRelationship(**crew_data))
    
    return crew_response


@router.get("/crew/{crew_id}", response_model=schemas.CrewMemberWithRelationship)
def get_crew_member(
    crew_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single crew member by ID with relationship notes.
    Only returns crew members that the current user manages or is themselves.
    """
    crew_member = db.query(models.User).filter(models.User.user_id == crew_id).first()
    
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Determine if this is a self-access vs manager-access
    is_self_access = str(crew_member.user_id) == str(user.user_id)
    
    # Get relationship data for manager access
    relationship = None
    if not is_self_access:
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.user_id,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.is_active.is_(True)
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to access this crew member")
    
    # Create response combining user data with appropriate notes
    crew_data = {
        # User fields
        "user_id": crew_member.user_id,
        "clerk_user_id": crew_member.clerk_user_id,
        "email_address": crew_member.email_address,
        "fullname_first": crew_member.fullname_first,
        "fullname_last": crew_member.fullname_last,
        "user_name": crew_member.user_name,
        "profile_img_url": crew_member.profile_img_url,
        "phone_number": crew_member.phone_number,
        "user_status": crew_member.user_status.value if crew_member.user_status is not None else "guest",
        "user_role": crew_member.user_role,
        "created_by": crew_member.created_by,
        "notes": crew_member.notes,  # Notes from User table
        "is_active": crew_member.is_active,
        "date_created": crew_member.date_created,
        "date_updated": crew_member.date_updated,
        # Include relationship notes separately
        "relationship_notes": relationship.notes if relationship else None
    }
    
    return schemas.CrewMemberWithRelationship(**crew_data)


@router.get("/crew/{crew_id}/assignments", response_model=schemas.CrewMemberWithAssignments)
def get_crew_member_with_assignments(
    crew_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single crew member by ID with their department assignments.
    Only returns crew members that the current user manages or is themselves.
    """
    crew_member = db.query(models.User).filter(models.User.user_id == crew_id).first()
    
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Determine if this is a self-access vs manager-access
    is_self_access = str(crew_member.user_id) == str(user.user_id)
    
    # Get relationship data for manager access
    relationship = None
    if not is_self_access:
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.user_id,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.is_active.is_(True)
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to access this crew member")
    
    # Get department assignments for this crew member
    assignments = db.query(models.CrewAssignment).filter(
        models.CrewAssignment.user_id == crew_id
    ).options(
        joinedload(models.CrewAssignment.show).joinedload(models.Show.venue),
        joinedload(models.CrewAssignment.department)
    ).all()
    
    # Format assignments for response using Pydantic serialization
    assignment_list = []
    for assignment in assignments:
        assignment_data = assignment.__dict__.copy()
        assignment_data['show_name'] = assignment.show.show_name if assignment.show else "Unknown Show"
        assignment_data['department_name'] = assignment.department.department_name if assignment.department else "Unknown Department"
        assignment_data['department_color'] = assignment.department.department_color if assignment.department else None
        assignment_data['department_initials'] = assignment.department.department_initials if assignment.department else None
        assignment_data['venue_name'] = assignment.show.venue.venue_name if assignment.show and assignment.show.venue else None
        assignment_data['venue_city'] = assignment.show.venue.city if assignment.show and assignment.show.venue else None
        assignment_data['venue_state'] = assignment.show.venue.state if assignment.show and assignment.show.venue else None
        assignment_data['show_date'] = assignment.show.show_date if assignment.show else None
        assignment_data['role'] = assignment.show_role
        assignment_data['share_url'] = f"/share/{assignment.share_token}" if assignment.share_token else None
        assignment_list.append(schemas.UserDepartmentAssignment(**assignment_data))
    
    # Create base crew member response using Pydantic serialization
    crew_data = crew_member.__dict__.copy()
    crew_data['user_status'] = crew_member.user_status.value if crew_member.user_status is not None else "guest"
    crew_data['relationship_notes'] = relationship.notes if relationship else None
    crew_data['department_assignments'] = assignment_list
    
    return schemas.CrewMemberWithAssignments(**crew_data)


@router.patch("/crew/{crew_id}", response_model=schemas.User)
def update_crew_member(
    crew_id: UUID,
    crew_update: schemas.GuestUserCreate,  # Reuse the same fields
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a crew member's information.
    Only allows updating crew members that the current user manages or is themselves.
    """
    crew_member = db.query(models.User).filter(models.User.user_id == crew_id).first()
    
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Security check: User can only update themselves or crew they manage
    if str(crew_member.user_id) != str(user.user_id):
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.user_id,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.is_active.is_(True)
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to update this crew member")
    
    # Update only the fields that were provided
    update_data = crew_update.model_dump(exclude_unset=True)
    logger.info(f"Updating crew member {crew_id} with data: {update_data}")
    
    # Determine if this is a self-edit vs manager-edit
    is_self_edit = str(crew_member.user_id) == str(user.user_id)
    
    if is_self_edit:
        # User editing themselves - update their actual user data
        logger.info(f"Self-edit detected for user {crew_id}")
        
        # Notes go to user record for self-edits (their personal notes)
        # All fields are editable including contact info
        for key, value in update_data.items():
            if hasattr(crew_member, key):
                setattr(crew_member, key, value)
        
    else:
        # Manager editing crew member - use relationship-based logic
        logger.info(f"Manager edit detected for crew member {crew_id}")
        
        # Handle notes separately - they belong to the relationship, not the user
        relationship_notes = update_data.pop('notes', None)
        
        # Don't allow changing certain fields for verified users when manager is editing
        if str(crew_member.user_status) == str(models.UserStatus.VERIFIED):
            # Remove fields that shouldn't be changed for verified users (they own their contact info and role)
            protected_fields = ['email_address', 'phone_number', 'fullname_first', 'fullname_last', 'user_role']
            for field in protected_fields:
                if update_data.pop(field, None) is not None:
                    logger.info(f"Removed {field} from update for verified user {crew_id} (manager edit)")
        
        # Update user fields (user_role, etc.)
        for key, value in update_data.items():
            if hasattr(crew_member, key):
                setattr(crew_member, key, value)
        
        # Update relationship notes if provided
        if relationship_notes is not None:
            relationship = db.query(models.CrewRelationship).filter(
                models.CrewRelationship.manager_user_id == user.user_id,
                models.CrewRelationship.crew_user_id == crew_id,
                models.CrewRelationship.is_active.is_(True)
            ).first()
            
            if relationship:
                relationship.notes = relationship_notes
                # date_updated will be automatically set by SQLAlchemy due to onupdate=func.now()
                logger.info(f"Updated relationship notes for crew member {crew_id}")
        
        # Clear user notes field for guest users (notes should be in relationship)
        if str(crew_member.user_status) == str(models.UserStatus.GUEST):
            crew_member.notes = None
    
    # Update the date_updated timestamp
    crew_member.date_updated = datetime.now(timezone.utc)
    
    try:
        db.commit()
        db.refresh(crew_member)
        return crew_member
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update crew member {crew_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update crew member: {str(e)}"
        )


@router.post("/crew-relationships/", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
def create_crew_relationship(
    relationship_data: schemas.CrewRelationshipCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a crew relationship for existing users."""
    # Check if relationship already exists
    existing_relationship = db.query(models.CrewRelationship).filter(
        models.CrewRelationship.manager_user_id == user.user_id,
        models.CrewRelationship.crew_user_id == relationship_data.crew_user_id
    ).first()
    
    if existing_relationship:
        if existing_relationship.is_active is True:
            raise HTTPException(status_code=400, detail="User already in your crew")
        else:
            # Reactivate existing relationship
            existing_relationship.is_active = True
            existing_relationship.notes = relationship_data.notes
            db.commit()
            return schemas.MessageResponse(message="Crew relationship reactivated")
    
    # Create new relationship
    new_relationship = models.CrewRelationship(
        manager_user_id=user.user_id,
        crew_user_id=relationship_data.crew_user_id,
        notes=relationship_data.notes
    )
    db.add(new_relationship)
    db.commit()
    
    return schemas.MessageResponse(message="User added to your crew")


@router.delete("/crew-relationships/{crew_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_crew_relationship(
    crew_user_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a crew relationship (remove crew member from manager's crew)."""
    # Find the crew relationship
    relationship_to_delete = db.query(models.CrewRelationship).filter(
        models.CrewRelationship.manager_user_id == user.user_id,
        models.CrewRelationship.crew_user_id == crew_user_id,
        models.CrewRelationship.is_active.is_(True)
    ).first()
    
    if not relationship_to_delete:
        raise HTTPException(status_code=404, detail="Crew relationship not found")
    
    # Delete the crew relationship (this preserves the guest user account)
    db.delete(relationship_to_delete)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)