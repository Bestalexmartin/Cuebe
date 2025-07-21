# backend/main.py

import os
import time
import secrets
from typing import Dict
from uuid import UUID
import logging

from fastapi import FastAPI, Depends, Request, HTTPException, Header, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from jose import jwt
from svix.webhooks import Webhook, WebhookVerificationError
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import local modules
import models
import schemas
from database import get_db, engine

# This creates tables on startup. Good for dev, but Alembic is the main tool.
# models.Base.metadata.create_all(bind=engine)

# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# AUTHENTICATION
# =============================================================================

bearer_scheme = HTTPBearer()

async def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> Dict:
    pem_key_str = os.getenv("CLERK_PEM_PUBLIC_KEY")
    if not pem_key_str:
        raise HTTPException(status_code=500, detail="Missing PEM Public Key")

    pem_key = pem_key_str.replace("\\n", "\n")
    token = credentials.credentials

    try:
        decoded_claims = jwt.decode(
            token,
            pem_key,
            algorithms=["RS256"],
            options={"verify_signature": True}
        )
        current_time = time.time()
        if decoded_claims.get("exp", 0) < current_time:
            raise HTTPException(status_code=401, detail="Token has expired")
        if decoded_claims.get("nbf", 0) > current_time:
            raise HTTPException(status_code=401, detail="Token not yet valid")
        return decoded_claims
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    claims: Dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> models.User:
    clerk_user_id = claims.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    user = db.query(models.User).filter(models.User.clerk_user_id == clerk_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/api/health")
def read_root():
    return {"status": "ok"}

# =============================================================================
# USER ENDPOINTS
# =============================================================================

@app.get("/api/users/check-email")
async def check_user_by_email(
    email: str,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if a user exists by email address."""
    existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()
    return existing_user

@app.post("/api/users/create-guest-with-relationship", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def create_guest_user_with_relationship(
    guest_data: schemas.GuestUserCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a guest user with crew relationship in an atomic operation."""
    # Double-check user doesn't already exist
    existing_user = db.query(models.User).filter(models.User.emailAddress == guest_data.emailAddress).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new guest user
    new_guest_user = models.User(
        emailAddress=guest_data.emailAddress,
        fullnameFirst=guest_data.fullnameFirst,
        fullnameLast=guest_data.fullnameLast,
        userRole=guest_data.userRole,
        userStatus=models.UserStatus.GUEST,  # Explicitly set as guest
        phoneNumber=guest_data.phoneNumber,
        notes=None,  # Notes belong in the relationship, not the user
        createdBy=user.userID,  # Track who created this guest user
        clerk_user_id=None,  # No Clerk integration yet
        userName=None,
        profileImgURL=None,
        isActive=True
    )
    db.add(new_guest_user)
    db.flush()  # Get the ID without committing
    
    # Create crew relationship
    crew_relationship = models.CrewRelationship(
        manager_user_id=user.userID,
        crew_user_id=new_guest_user.userID,
        notes=guest_data.notes
    )
    db.add(crew_relationship)
    
    # Commit both operations
    db.commit()
    db.refresh(new_guest_user)
    
    return new_guest_user

# =============================================================================
# CREW ENDPOINTS
# =============================================================================

@app.get("/api/me/crews", response_model=list[schemas.User])
async def read_crew_members(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get crews for the current user (themselves + users they manage)."""
    # Show current user + users they manage via CrewRelationship
    my_crew = db.query(models.User).filter(
        or_(
            models.User.userID == user.userID,  # Show yourself
            models.User.userID.in_(  # Show users you manage
                db.query(models.CrewRelationship.crew_user_id)
                .filter(models.CrewRelationship.manager_user_id == user.userID)
                .filter(models.CrewRelationship.isActive == True)
            )
        )
    ).all()
    
    return my_crew

@app.get("/api/crew/{crew_id}", response_model=schemas.CrewMemberWithRelationship)
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
    is_self_access = crew_member.userID == user.userID
    
    # Get relationship data for manager access
    relationship = None
    if not is_self_access:
        # Check if current user manages this crew member
        relationship = db.query(models.CrewRelationship).filter(
            models.CrewRelationship.manager_user_id == user.userID,
            models.CrewRelationship.crew_user_id == crew_id,
            models.CrewRelationship.isActive == True
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
        "userStatus": crew_member.userStatus.value if crew_member.userStatus else "guest",
        "userRole": crew_member.userRole,
        "createdBy": crew_member.createdBy,
        "isActive": crew_member.isActive,
        "dateCreated": crew_member.dateCreated,
        "dateUpdated": crew_member.dateUpdated,
        # Notes field - use relationship notes for manager access, user notes for self access
        "relationshipNotes": relationship.notes if relationship else crew_member.notes
    }
    
    return schemas.CrewMemberWithRelationship(**crew_data)

@app.patch("/api/crew/{crew_id}", response_model=schemas.User)
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
            models.CrewRelationship.isActive == True
        ).first()
        
        if not relationship:
            raise HTTPException(status_code=403, detail="Not authorized to update this crew member")
    
    # Update only the fields that were provided
    update_data = crew_update.model_dump(exclude_unset=True)
    logger.info(f"Updating crew member {crew_id} with data: {update_data}")
    
    # Determine if this is a self-edit vs manager-edit
    is_self_edit = crew_member.userID == user.userID
    
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
        if crew_member.userStatus == models.UserStatus.VERIFIED: # type: ignore
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
                models.CrewRelationship.isActive == True
            ).first()
            
            if relationship:
                relationship.notes = relationship_notes
                relationship.dateUpdated = datetime.utcnow()
                logger.info(f"Updated relationship notes for crew member {crew_id}")
        
        # Clear user notes field for guest users (notes should be in relationship)
        if crew_member.userStatus == models.UserStatus.GUEST:
            crew_member.notes = None
    
    # Update the dateUpdated timestamp
    crew_member.dateUpdated = datetime.utcnow() # type: ignore
    
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

@app.post("/api/crew-relationships/", status_code=status.HTTP_201_CREATED)
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
        if existing_relationship.isActive: # type: ignore
            raise HTTPException(status_code=400, detail="User already in your crew")
        else:
            # Reactivate existing relationship
            existing_relationship.isActive = True # type: ignore
            existing_relationship.notes = relationship_data.notes # type: ignore
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

@app.delete("/api/crew-relationships/{crew_user_id}", status_code=status.HTTP_204_NO_CONTENT)
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
        models.CrewRelationship.isActive == True
    ).first()
    
    if not relationship_to_delete:
        raise HTTPException(status_code=404, detail="Crew relationship not found")

    # TODO: Future enhancement - Remove crew member from any show assignments
    # When show assignments are implemented, add logic here to:
    # 1. Find all show assignments for this crew member under this manager
    # 2. Delete or deactivate those assignments
    # 3. Log the cleanup for debugging
    
    # For now, just log that this will be needed
    logger.info(f"Deleting crew relationship between manager {user.userID} and crew member {crew_user_id}")
    logger.info("TODO: Remove crew member from show assignments when that feature is implemented")
    
    # Delete the crew relationship (this preserves the guest user account)
    db.delete(relationship_to_delete)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# =============================================================================
# VENUE ENDPOINTS
# =============================================================================

@app.get("/api/me/venues", response_model=list[schemas.Venue])
async def read_venues(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get venues owned by the current user."""
    venues = db.query(models.Venue).filter(models.Venue.ownerID == user.userID).all()
    return venues

@app.post("/api/me/venues", response_model=schemas.Venue, status_code=status.HTTP_201_CREATED)
async def create_venue(
    venue: schemas.VenueCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new venue owned by the current user."""
    venue_data = venue.model_dump()
    venue_data['ownerID'] = user.userID
    new_venue = models.Venue(**venue_data)
    db.add(new_venue)
    db.commit()
    db.refresh(new_venue)
    return new_venue

@app.get("/api/venues/{venue_id}", response_model=schemas.Venue)
async def get_venue(
    venue_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single venue by ID (must be owned by current user)."""
    venue = db.query(models.Venue).filter(
        models.Venue.venueID == venue_id,
        models.Venue.ownerID == user.userID
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue

@app.patch("/api/venues/{venue_id}", response_model=schemas.Venue)
async def update_venue(
    venue_id: UUID,
    venue_update: schemas.VenueCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a venue."""
    venue_to_update = db.query(models.Venue).filter(
        models.Venue.venueID == venue_id,
        models.Venue.ownerID == user.userID
    ).first()
    if not venue_to_update:
        raise HTTPException(status_code=404, detail="Venue not found")

    update_data = venue_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(venue_to_update, key, value)
    
    # Update the dateUpdated timestamp
    venue_to_update.dateUpdated = datetime.utcnow() # type: ignore
    
    db.commit()
    db.refresh(venue_to_update)
    return venue_to_update

@app.delete("/api/venues/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_venue(
    venue_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a venue and nullify venue references in shows."""
    venue_to_delete = db.query(models.Venue).filter(
        models.Venue.venueID == venue_id,
        models.Venue.ownerID == user.userID
    ).first()
    if not venue_to_delete:
        raise HTTPException(status_code=404, detail="Venue not found")

    # First, nullify the venueID in any shows that reference this venue
    shows_using_venue = db.query(models.Show).filter(
        models.Show.venueID == venue_id,
        models.Show.ownerID == user.userID  # Only update user's own shows
    ).all()
    
    for show in shows_using_venue:
        show.venueID = None # type: ignore
        show.dateUpdated = datetime.utcnow() # type: ignore
    
    # Log the cleanup for debugging
    if shows_using_venue:
        logger.info(f"Nullified venue reference for {len(shows_using_venue)} shows when deleting venue {venue_id}")
    
    # Now delete the venue
    db.delete(venue_to_delete)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# =============================================================================
# DEPARTMENT ENDPOINTS
# =============================================================================

@app.get("/api/me/departments", response_model=list[schemas.Department])
async def read_departments(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get departments owned by the current user."""
    departments = db.query(models.Department).filter(models.Department.ownerID == user.userID).all()
    return departments

@app.post("/api/me/departments", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
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

@app.get("/api/departments/{department_id}", response_model=schemas.Department)
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

@app.patch("/api/departments/{department_id}", response_model=schemas.Department)
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

@app.delete("/api/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    
    guest_links = db.query(models.GuestAccessLink).filter(
        models.GuestAccessLink.departmentID == department_id
    ).count()
    
    # If there are dependencies, prevent deletion and inform user
    dependencies = []
    if crew_assignments > 0:
        dependencies.append(f"{crew_assignments} crew assignment(s)")
    if script_elements > 0:
        dependencies.append(f"{script_elements} script element(s)")
    if guest_links > 0:
        dependencies.append(f"{guest_links} guest access link(s)")
    
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

# =============================================================================
# SHOW ENDPOINTS
# =============================================================================

@app.post("/api/shows/", response_model=schemas.Show)
async def create_show(
    show: schemas.ShowCreate, 
    db: Session = Depends(get_db), 
    user: models.User = Depends(get_current_user)
):
    """Create a new show with a default first draft script."""
    new_show = models.Show(
        showName=show.showName,
        venueID=show.venueID,
        showDate=show.showDate,
        showNotes=show.showNotes,
        deadline=show.deadline,
        ownerID=user.userID
    )
    db.add(new_show)
    db.commit()
    db.refresh(new_show)

    # Create first draft script
    first_draft = models.Script(
        scriptName="First Draft",
        showID=new_show.showID,
        ownerID=user.userID
    )
    db.add(first_draft)
    db.commit()
    
    return new_show

@app.get("/api/me/shows", response_model=list[schemas.Show])
async def read_shows_for_current_user(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db), 
    skip: int = 0,
    limit: int = 100
):
    """Get all shows owned by the current user."""
    shows = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue)
    ).filter(models.Show.ownerID == user.userID).offset(skip).limit(limit).all()
    
    return shows

@app.get("/api/shows/{show_id}", response_model=schemas.Show)
async def read_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single show by ID."""
    logger.info(f"Looking for show with UUID: {show_id}")
    show = db.query(models.Show).options(
        joinedload(models.Show.scripts).joinedload(models.Script.elements),
        joinedload(models.Show.venue),
        joinedload(models.Show.crew)
    ).filter(models.Show.showID == show_id).first()
    
    if not show:
        logger.warning(f"Show not found in DB: {show_id}")
        raise HTTPException(status_code=404, detail="Show not found")
    
    # Security check: ensure the user owns this show
    if show.ownerID != user.userID: # type: ignore
        logger.warning(f"User {user.userID} attempted to access show {show_id} without permission")
        raise HTTPException(status_code=403, detail="Not authorized to view this show")

    return show

@app.patch("/api/shows/{show_id}", response_model=schemas.Show)
async def update_show(
    show_id: UUID,
    show_update: schemas.ShowCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a show."""
    show_to_update = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show_to_update:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security check
    if show_to_update.ownerID != user.userID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to update this show")

    update_data = show_update.model_dump(exclude_unset=True)
    logger.info(f"Updating show {show_id} with data: {update_data}")

    for key, value in update_data.items():
        setattr(show_to_update, key, value)
    
    # Update the dateUpdated timestamp
    show_to_update.dateUpdated = datetime.utcnow() # type: ignore
    
    db.commit()
    db.refresh(show_to_update)
    
    return show_to_update

@app.delete("/api/shows/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a show and all associated scripts."""
    show_to_delete = db.query(models.Show).filter(
        models.Show.showID == show_id,
        models.Show.ownerID == user.userID
    ).first()
    if not show_to_delete:
        raise HTTPException(status_code=404, detail="Show not found")

    # Delete all scripts associated with this show
    scripts_to_delete = db.query(models.Script).filter(
        models.Script.showID == show_id,
        models.Script.ownerID == user.userID
    ).all()
    
    script_count = len(scripts_to_delete)
    
    # Delete script elements first (due to foreign key constraints)
    for script in scripts_to_delete:
        script_elements = db.query(models.ScriptElement).filter(
            models.ScriptElement.scriptID == script.scriptID
        ).all()
        for element in script_elements:
            db.delete(element)
    
    # Delete scripts
    for script in scripts_to_delete:
        db.delete(script)
    
    # Log the cleanup for debugging
    if script_count > 0:
        logger.info(f"Deleted {script_count} scripts and their elements when deleting show {show_id}")
    
    # Finally delete the show
    db.delete(show_to_delete)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# =============================================================================
# SCRIPT ENDPOINTS
# =============================================================================

@app.post("/api/shows/{show_id}/scripts/", response_model=schemas.Script)
async def create_script_for_show(
    show_id: UUID,
    script: schemas.ScriptCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new script for a show."""
    # Find the show this script will belong to
    show = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Security Check: Make sure the current user owns this show
    if show.ownerID != user.userID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to add a script to this show")

    # Create the new script
    new_script = models.Script(
        showID=show_id,
        scriptName=script.scriptName or "New Script",
        scriptStatus=models.ScriptStatus(script.scriptStatus) if script.scriptStatus else models.ScriptStatus.DRAFT,
        startTime=show.showDate,  # Inherit show datetime as start time
        ownerID=user.userID
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)

    return new_script

@app.get("/api/scripts/{script_id}", response_model=schemas.Script)
async def get_script(
    script_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single script by ID."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show),
        joinedload(models.Script.elements)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through direct ownership or show ownership)
    if script.ownerID != user.userID and script.show.ownerID != user.userID: # type: ignore
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this script"
        )
    
    return script

@app.patch("/api/scripts/{script_id}", response_model=schemas.Script)
async def update_script(
    script_id: UUID,
    script_update: schemas.ScriptUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a script's metadata."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.ownerID != user.userID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this script"
        )
    
    # Update only the fields that were provided
    update_data = script_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if hasattr(script, field):
            setattr(script, field, value)
    
    # Update the dateUpdated timestamp
    script.dateUpdated = datetime.utcnow() # type: ignore
    
    try:
        db.commit()
        db.refresh(script)
        return script
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update script {script_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update script: {str(e)}"
        )

@app.delete("/api/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_script(
    script_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a script and all its elements."""
    # Query the script from database with show relationship for authorization
    script = db.query(models.Script).options(
        joinedload(models.Script.show)
    ).filter(models.Script.scriptID == script_id).first()
    
    if not script:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Script not found"
        )
    
    # Check if user has access to this script (through show ownership)
    if script.show.ownerID != user.userID:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this script"
        )
    
    try:
        # Delete the script (cascade will handle script elements)
        db.delete(script)
        db.commit()
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete script {script_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete script: {str(e)}"
        )

# =============================================================================
# GUEST ACCESS ENDPOINTS
# =============================================================================

@app.post("/api/shows/{show_id}/guest-links")
def create_guest_link_for_show(
    show_id: UUID,
    request: schemas.GuestLinkCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a guest access link for a specific show and department."""
    # Verify the show exists and user owns it
    show = db.query(models.Show).filter(models.Show.showID == show_id).first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    
    if show.ownerID != user.userID: # type: ignore
        raise HTTPException(status_code=403, detail="Not authorized to create guest links for this show")
    
    # Verify the department exists
    department = db.query(models.Department).filter(models.Department.departmentID == request.departmentID).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Generate a secure, URL-safe token
    token = secrets.token_urlsafe(32)
    
    new_link = models.GuestAccessLink(
        accessToken=token,
        showID=show_id,
        departmentID=request.departmentID,
        linkName=request.linkName
    )
    db.add(new_link)
    db.commit()
    db.refresh(new_link)
    
    return {"guest_access_url": f"/guest/{token}"}

@app.get("/api/guest/{access_token}", response_model=list[schemas.ScriptElement])
def get_script_for_guest(access_token: str, db: Session = Depends(get_db)):
    """Get script elements for a guest user via access token."""
    # Find the link in the database
    link = db.query(models.GuestAccessLink).filter(models.GuestAccessLink.accessToken == access_token).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Access link not found or invalid")
    
    # Check if link is expired
    if link.expiresAt and link.expiresAt < datetime.now(): # type: ignore
        raise HTTPException(status_code=403, detail="Access link has expired")
        
    # Find the "live" script for the show this link belongs to
    script = db.query(models.Script).filter(
        models.Script.showID == link.showID,
        models.Script.scriptStatus == 'live'
    ).first()

    if not script:
        raise HTTPException(status_code=404, detail="Live script for this show not found")

    # Fetch only the active calls for the department associated with this link
    elements = db.query(models.ScriptElement).filter(
        models.ScriptElement.scriptID == script.scriptID,
        models.ScriptElement.departmentID == link.departmentID,
        models.ScriptElement.isActive == True
    ).order_by(models.ScriptElement.elementOrder).all()

    return elements

# =============================================================================
# CLERK WEBHOOK
# =============================================================================

@app.post("/api/webhooks/clerk")
async def handle_clerk_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Clerk authentication webhooks for user lifecycle management."""
    headers = request.headers
    payload = await request.body()
    webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        wh = Webhook(webhook_secret)
        event = wh.verify(payload, dict(headers))
    except WebhookVerificationError as e:
        logger.error(f"Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event['type']
    user_data = event['data']
    
    logger.info(f"Received webhook for event: {event_type}")

    if event_type == 'user.created':
        email = user_data.get('email_addresses', [{}])[0].get('email_address')
        new_clerk_id = user_data.get('id')
        
        existing_user = db.query(models.User).filter(models.User.emailAddress == email).first()

        if existing_user:
            # Update existing user (whether active guest or inactive user)
            existing_user.isActive = True # type: ignore
            existing_user.clerk_user_id = new_clerk_id
            existing_user.userName = user_data.get('username')
            existing_user.userStatus = models.UserStatus.VERIFIED # type: ignore
            # Update name and profile if provided by Clerk and not already set
            if user_data.get('first_name') and not existing_user.fullnameFirst:
                existing_user.fullnameFirst = user_data.get('first_name')
            if user_data.get('last_name') and not existing_user.fullnameLast:
                existing_user.fullnameLast = user_data.get('last_name')
            if user_data.get('image_url'):
                existing_user.profileImgURL = user_data.get('image_url')
        else:
            logger.info(f"Creating new user for email: {email}")
            new_user = models.User(
                clerk_user_id=new_clerk_id,
                emailAddress=email,
                userName=user_data.get('username'),
                fullnameFirst=user_data.get('first_name'),
                fullnameLast=user_data.get('last_name'),
                profileImgURL=user_data.get('image_url'),
                userStatus=models.UserStatus.VERIFIED,
                isActive=True
            )
            db.add(new_user)
        
        db.commit()

    elif event_type == 'user.updated':
        user_to_update = db.query(models.User).filter(models.User.clerk_user_id == user_data['id']).first()
        if user_to_update:
            user_to_update.emailAddress = user_data['email_addresses'][0]['email_address']
            user_to_update.userName = user_data.get('username')
            user_to_update.fullnameFirst = user_data.get('first_name')
            user_to_update.fullnameLast = user_data.get('last_name')
            user_to_update.profileImgURL = user_data.get('image_url')
            db.commit()
            logger.info(f"User {user_data['id']} updated.")

    elif event_type == 'user.deleted':
        clerk_id_to_delete = user_data.get('id')
        if clerk_id_to_delete:
            user_to_deactivate = db.query(models.User).filter(models.User.clerk_user_id == clerk_id_to_delete).first()
            if user_to_deactivate:
                user_to_deactivate.isActive = False # type: ignore
                db.commit()
                logger.info(f"User {clerk_id_to_delete} deactivated.")
    
    return {"status": "ok"}