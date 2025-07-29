# backend/routers/crews.py

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
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
async def read_crew_members(
    request: Request,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get crews for the current user (themselves + users they manage) with relationship data."""
    # Get all crew members (current user + users they manage)
    crew_members = db.query(models.User).filter(
        or_(
            models.User.userID == user.userID,  # Show yourself
            models.User.userID.in_(  # Show users you manage
                db.query(models.CrewRelationship.crew_user_id)
                .filter(models.CrewRelationship.manager_user_id == user.userID)
                .filter(models.CrewRelationship.isActive.is_(True))
            )
        )
    ).all()
    
    # Build response with relationship data
    crew_response = []
    for crew_member in crew_members:
        # Get relationship data if this is not the current user
        relationship = None
        if not bool(crew_member.userID == user.userID):
            relationship = db.query(models.CrewRelationship).filter(
                models.CrewRelationship.manager_user_id == user.userID,
                models.CrewRelationship.crew_user_id == crew_member.userID,
                models.CrewRelationship.isActive.is_(True)
            ).first()
        
        # Create response data combining user data with relationship notes
        crew_data = {
            # User fields
            "userID": crew_member.userID,
            "clerk_user_id": crew_member.clerk_user_id,
            "emailAddress": crew_member.emailAddress,
            "fullnameFirst": crew_member.fullnameFirst,
            "fullnameLast": crew_member.fullnameLast,
            "userName": crew_member.userName,
            "profileImgURL": crew_member.profileImgURL,
            "phoneNumber": crew_member.phoneNumber,
            "userStatus": crew_member.userStatus.value if crew_member.userStatus is not None else "guest",
            "userRole": crew_member.userRole,
            "createdBy": crew_member.createdBy,
            "notes": crew_member.notes,  # Notes from User table
            "isActive": crew_member.isActive,
            "dateCreated": crew_member.dateCreated,
            "dateUpdated": crew_member.dateUpdated,
            # Include both user notes and relationship notes
            "relationshipNotes": relationship.notes if relationship else None
        }
        
        crew_response.append(schemas.CrewMemberWithRelationship(**crew_data))
    
    return crew_response


@router.get("/crew/{crew_id}", response_model=schemas.CrewMemberWithRelationship)
async def get_crew_member(
    crew_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single crew member by ID with relationship notes.
    Only returns crew members that the current user manages or is themselves.
    """
    crew_member = db.query(models.User).filter(models.User.userID == crew_id).first()
    
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Determine if this is a self-access vs manager-access
    is_self_access = bool(crew_member.userID == user.userID)
    
    # Get relationship data for manager access
    relationship = None
    if not is_self_access:
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.userID,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.isActive.is_(True)
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to access this crew member")
    
    # Create response combining user data with appropriate notes
    crew_data = {
        # User fields
        "userID": crew_member.userID,
        "clerk_user_id": crew_member.clerk_user_id,
        "emailAddress": crew_member.emailAddress,
        "fullnameFirst": crew_member.fullnameFirst,
        "fullnameLast": crew_member.fullnameLast,
        "userName": crew_member.userName,
        "profileImgURL": crew_member.profileImgURL,
        "phoneNumber": crew_member.phoneNumber,
        "userStatus": crew_member.userStatus.value if crew_member.userStatus is not None else "guest",
        "userRole": crew_member.userRole,
        "createdBy": crew_member.createdBy,
        "notes": crew_member.notes,  # Notes from User table
        "isActive": crew_member.isActive,
        "dateCreated": crew_member.dateCreated,
        "dateUpdated": crew_member.dateUpdated,
        # Include relationship notes separately
        "relationshipNotes": relationship.notes if relationship else None
    }
    
    return schemas.CrewMemberWithRelationship(**crew_data)


@router.patch("/crew/{crew_id}", response_model=schemas.User)
async def update_crew_member(
    crew_id: UUID,
    crew_update: schemas.GuestUserCreate,  # Reuse the same fields
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a crew member's information.
    Only allows updating crew members that the current user manages or is themselves.
    """
    crew_member = db.query(models.User).filter(models.User.userID == crew_id).first()
    
    if not crew_member:
        raise HTTPException(status_code=404, detail="Crew member not found")
    
    # Security check: User can only update themselves or crew they manage
    if crew_member.userID != user.userID: # type: ignore
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.userID,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.isActive.is_(True)
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to update this crew member")
    
    # Update only the fields that were provided
    update_data = crew_update.model_dump(exclude_unset=True)
    logger.info(f"Updating crew member {crew_id} with data: {update_data}")
    
    # Determine if this is a self-edit vs manager-edit
    is_self_edit = bool(crew_member.userID == user.userID)
    
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
        if crew_member.userStatus == models.UserStatus.VERIFIED:
            # Remove fields that shouldn't be changed for verified users (they own their contact info and role)
            protected_fields = ['emailAddress', 'phoneNumber', 'fullnameFirst', 'fullnameLast', 'userRole']
            for field in protected_fields:
                if update_data.pop(field, None) is not None:
                    logger.info(f"Removed {field} from update for verified user {crew_id} (manager edit)")
        
        # Update user fields (userRole, etc.)
        for key, value in update_data.items():
            if hasattr(crew_member, key):
                setattr(crew_member, key, value)
        
        # Update relationship notes if provided
        if relationship_notes is not None:
            relationship = db.query(models.CrewRelationship).filter(
                models.CrewRelationship.manager_user_id == user.userID,
                models.CrewRelationship.crew_user_id == crew_id,
                models.CrewRelationship.isActive.is_(True)
            ).first()
            
            if relationship:
                relationship.notes = relationship_notes
                # dateUpdated will be automatically set by SQLAlchemy due to onupdate=func.now()
                logger.info(f"Updated relationship notes for crew member {crew_id}")
        
        # Clear user notes field for guest users (notes should be in relationship)
        if crew_member.userStatus == models.UserStatus.GUEST:
            setattr(crew_member, 'notes', None)
    
    # Update the dateUpdated timestamp
    setattr(crew_member, 'dateUpdated', datetime.now(timezone.utc))
    
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


@router.post("/crew-relationships/", status_code=status.HTTP_201_CREATED)
async def create_crew_relationship(
    relationship_data: schemas.CrewRelationshipCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a crew relationship for existing users."""
    # Check if relationship already exists
    existing_relationship = db.query(models.CrewRelationship).filter(
        models.CrewRelationship.manager_user_id == user.userID,
        models.CrewRelationship.crew_user_id == relationship_data.crew_user_id
    ).first()
    
    if existing_relationship:
        if existing_relationship.isActive.is_(True):
            raise HTTPException(status_code=400, detail="User already in your crew")
        else:
            # Reactivate existing relationship
            setattr(existing_relationship, 'isActive', True)
            setattr(existing_relationship, 'notes', relationship_data.notes)
            db.commit()
            return {"message": "Crew relationship reactivated"}
    
    # Create new relationship
    new_relationship = models.CrewRelationship(
        manager_user_id=user.userID,
        crew_user_id=relationship_data.crew_user_id,
        notes=relationship_data.notes
    )
    db.add(new_relationship)
    db.commit()
    
    return {"message": "User added to your crew"}


@router.delete("/crew-relationships/{crew_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crew_relationship(
    crew_user_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a crew relationship (remove crew member from manager's crew)."""
    # Find the crew relationship
    relationship_to_delete = db.query(models.CrewRelationship).filter(
        models.CrewRelationship.manager_user_id == user.userID,
        models.CrewRelationship.crew_user_id == crew_user_id,
        models.CrewRelationship.isActive.is_(True)
    ).first()
    
    if not relationship_to_delete:
        raise HTTPException(status_code=404, detail="Crew relationship not found")
    
    # Delete the crew relationship (this preserves the guest user account)
    db.delete(relationship_to_delete)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)