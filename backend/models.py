# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func, Boolean, Text, Interval, UniqueConstraint, Index, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

Base = declarative_base()

# =============================================================================
# ENUMS
# =============================================================================

class ElementType(enum.Enum):
    """Types of script elements"""
    CUE = "cue"
    NOTE = "note"
    MARKER = "marker"
    STANDBY = "standby"
    WARNING = "warning"

class UserStatus(enum.Enum):
    """User authentication status"""
    GUEST = "guest"         # Created by someone else, no Clerk account
    VERIFIED = "verified"   # Has Clerk account and can log in

# =============================================================================
# USER MODELS
# =============================================================================

class User(Base):
    """Unified user model supporting both guest and verified users"""
    __tablename__ = "userTable"
    
    # Primary key
    ID = Column(Integer, primary_key=True, index=True)
    
    # Clerk integration (nullable for guest users)
    clerk_user_id = Column(String, unique=True, nullable=True, index=True)
    
    # Core user information
    emailAddress = Column(String, unique=True, nullable=False, index=True)
    fullnameFirst = Column(String, nullable=False)
    fullnameLast = Column(String, nullable=False)
    
    # Optional fields
    userName = Column(String, unique=True, nullable=True, index=True)
    profileImgURL = Column(String, nullable=True)
    phoneNumber = Column(String, nullable=True)
    
    # User status and role
    userStatus = Column(Enum(UserStatus), default=UserStatus.VERIFIED, nullable=False)
    userRole = Column(String, default="admin")  # admin for verified users, crew for guests
    
    # Guest user management
    createdBy = Column(Integer, ForeignKey("userTable.ID"), nullable=True)  # Who created this guest user
    invitedAt = Column(DateTime, nullable=True)  # When invitation was sent
    invitationToken = Column(String, unique=True, nullable=True)  # For invitation links
    
    # Internal notes (for guest users)
    notes = Column(Text, nullable=True)
    
    # Status and timestamps
    isActive = Column(Boolean, default=True)
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    shows = relationship("Show", back_populates="showOwner")
    crew_assignments = relationship("CrewAssignment", back_populates="user")
    
    # Guest user management relationships
    created_users = relationship("User", remote_side=[ID], backref="creator")
    
    # Crew relationship management
    managed_crew = relationship("CrewRelationship", foreign_keys="CrewRelationship.manager_user_id", back_populates="manager")
    managed_by = relationship("CrewRelationship", foreign_keys="CrewRelationship.crew_user_id", back_populates="crew_member")

class CrewRelationship(Base):
    """Many-to-many relationship for crew management"""
    __tablename__ = "crewRelationshipsTable"
    __table_args__ = (
        UniqueConstraint('manager_user_id', 'crew_user_id', name='unique_manager_crew'),
    )
    
    # Primary key
    relationshipID = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    manager_user_id = Column(Integer, ForeignKey("userTable.ID"), nullable=False)  # The verified user who manages
    crew_user_id = Column(Integer, ForeignKey("userTable.ID"), nullable=False)     # The user being managed
    
    # Status and metadata
    isActive = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    manager = relationship("User", foreign_keys=[manager_user_id], back_populates="managed_crew")
    crew_member = relationship("User", foreign_keys=[crew_user_id], back_populates="managed_by")

# =============================================================================
# VENUE MODELS
# =============================================================================

class Venue(Base):
    """Theater venue information"""
    __tablename__ = "venuesTable"
    
    # Primary key
    venueID = Column(Integer, primary_key=True, index=True)
    venueName = Column(String, unique=True, nullable=False)
    
    # Location Information
    address = Column(Text, nullable=True)
    
    # Venue Details
    capacity = Column(Integer, nullable=True)
    venueType = Column(String, nullable=True)  # e.g., "Proscenium", "Thrust", "Arena", "Black Box"
    
    # Contact Information
    contactName = Column(String, nullable=True)
    contactEmail = Column(String, nullable=True)
    contactPhone = Column(String, nullable=True)
    
    # Technical Specifications (in feet)
    stageWidth = Column(Integer, nullable=True)
    stageDepth = Column(Integer, nullable=True)
    flyHeight = Column(Integer, nullable=True)
    
    # Equipment and Features (stored as JSON array)
    equipment = Column(JSON, nullable=True)  # e.g., ["Fly System", "Orchestra Pit", "Sound System"]
    
    # Additional Information
    notes = Column(Text, nullable=True)
    
    # Rental Information
    rentalRate = Column(Integer, nullable=True)  # Daily rate in dollars
    minimumRental = Column(Integer, nullable=True)  # Minimum rental amount
    
    # Timestamps
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    shows = relationship("Show", back_populates="venue")

# =============================================================================
# DEPARTMENT MODELS
# =============================================================================

class Department(Base):
    """Theater departments (Sound, Lighting, etc.)"""
    __tablename__ = "departmentsTable"
    
    # Primary key
    departmentID = Column(Integer, primary_key=True, index=True)
    departmentName = Column(String, nullable=False)
    departmentDescription = Column(String, nullable=True)
    departmentColor = Column(String, nullable=True)  # e.g., "#FF5733"
    
    # Timestamps
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

# =============================================================================
# SHOW MODELS
# =============================================================================

class Show(Base):
    """Theater production/show"""
    __tablename__ = "showsTable"

    # Primary key
    showID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core show information
    showName = Column(String, index=True, nullable=False)
    showDate = Column(Date, nullable=True)
    showNotes = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=True)
    
    # Foreign keys
    venueID = Column(Integer, ForeignKey("venuesTable.venueID"), nullable=True)
    ownerID = Column(Integer, ForeignKey("userTable.ID"), nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    showOwner = relationship("User", back_populates="shows", foreign_keys=[ownerID])
    venue = relationship("Venue", back_populates="shows")
    scripts = relationship("Script", back_populates="show", cascade="all, delete-orphan")
    crew = relationship("CrewAssignment", back_populates="show", cascade="all, delete-orphan")

class CrewAssignment(Base):
    """Assignment of crew members to shows with specific departments and roles"""
    __tablename__ = "crewAssignmentsTable"
    __table_args__ = (
        UniqueConstraint('showID', 'userID', 'departmentID', name='unique_user_show_dept'),
    )
    
    # Primary key
    assignmentID = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"), nullable=False)
    userID = Column(Integer, ForeignKey("userTable.ID"), nullable=False)
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=False)
    
    # Show-specific role (may differ from user's general role)
    showRole = Column(String, nullable=True)  # e.g., "Head of Sound", "Assistant LD"
    
    # Assignment status and timestamps
    isActive = Column(Boolean, default=True, nullable=False)
    dateAssigned = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="crew_assignments")
    department = relationship("Department")
    show = relationship("Show", back_populates="crew")

# =============================================================================
# SCRIPT MODELS
# =============================================================================

class Script(Base):
    """Call script for a show"""
    __tablename__ = "scriptsTable"
    
    # Primary key
    scriptID = Column(Integer, primary_key=True, index=True)
    
    # Core script information
    scriptName = Column(String, nullable=False)
    scriptStatus = Column(String, default="ready")  # e.g., 'ready', 'running', 'paused', 'done'
    
    # Timing information
    intendedStartTime = Column(DateTime(timezone=True), nullable=True)
    actualStartTime = Column(DateTime(timezone=True), nullable=True)
    
    # Status flags
    isPinned = Column(Boolean, default=False, nullable=False)
    
    # Foreign keys
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"), nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.elementOrder")

class ScriptElement(Base):
    """Individual elements (cues, notes, etc.) within a script"""
    __tablename__ = "scriptElementsTable"
    __table_args__ = (
        Index('idx_scriptelement_timeoffset', 'timeOffset'),
        Index('idx_scriptelement_script_order', 'scriptID', 'elementOrder'),
    )
    
    # Primary key
    elementID = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    scriptID = Column(Integer, ForeignKey("scriptsTable.scriptID"), nullable=False)
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=True)
    
    # Element information
    elementType = Column(Enum(ElementType), nullable=False)
    elementOrder = Column(Integer, nullable=False)
    cueNumber = Column(String, nullable=True)
    elementDescription = Column(Text, nullable=True)
    
    # Timing
    timeOffset = Column(Interval, nullable=False)
    
    # Status
    isActive = Column(Boolean, default=True, nullable=False)

    # Relationships
    script = relationship("Script", back_populates="elements")
    department = relationship("Department")

# =============================================================================
# GUEST ACCESS MODELS
# =============================================================================

class GuestAccessLink(Base):
    """Secure links for guest users to access their call information"""
    __tablename__ = "guestAccessLinksTable"
    
    # Primary key
    linkID = Column(Integer, primary_key=True, index=True)
    
    # Access token
    accessToken = Column(String, unique=True, index=True, nullable=False)
    
    # What this link provides access to
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"), nullable=False)
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=False)

    # Optional metadata
    linkName = Column(String, nullable=True)  # e.g., "Guest Mic 1"
    expiresAt = Column(DateTime, nullable=True)
    
    # Timestamps
    dateCreated = Column(DateTime, server_default=func.now())

    # Relationships
    show = relationship("Show")
    department = relationship("Department")