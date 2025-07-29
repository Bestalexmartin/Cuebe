# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func, Boolean, Text, Interval, UniqueConstraint, Index, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum
from datetime import datetime, timezone

Base = declarative_base()

# =============================================================================
# ENUMS
# =============================================================================

class ElementType(enum.Enum):
    """Types of script elements"""
    CUE = "CUE"
    NOTE = "NOTE"

class TriggerType(enum.Enum):
    """How script elements are triggered"""
    MANUAL = "MANUAL"
    TIME = "TIME"
    AUTO = "AUTO"
    FOLLOW = "FOLLOW"
    GO = "GO"
    STANDBY = "STANDBY"

class ExecutionStatus(enum.Enum):
    """Current execution status of script elements"""
    PENDING = "PENDING"
    READY = "READY"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"

class PriorityLevel(enum.Enum):
    """Priority levels for script elements"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    OPTIONAL = "OPTIONAL"

class LocationArea(enum.Enum):
    """Theater location areas"""
    STAGE_LEFT = "stage_left"
    STAGE_RIGHT = "stage_right"
    CENTER_STAGE = "center_stage"
    UPSTAGE = "upstage"
    DOWNSTAGE = "downstage"
    STAGE_LEFT_UP = "stage_left_up"
    STAGE_RIGHT_UP = "stage_right_up"
    STAGE_LEFT_DOWN = "stage_left_down"
    STAGE_RIGHT_DOWN = "stage_right_down"
    FLY_GALLERY = "fly_gallery"
    BOOTH = "booth"
    HOUSE = "house"
    BACKSTAGE = "backstage"
    WINGS_LEFT = "wings_left"
    WINGS_RIGHT = "wings_right"
    GRID = "grid"
    TRAP = "trap"
    PIT = "pit"
    LOBBY = "lobby"
    DRESSING_ROOM = "dressing_room"
    OTHER = "other"

class ConditionType(enum.Enum):
    """Types of conditional rules"""
    WEATHER = "weather"
    CAST = "cast"
    EQUIPMENT = "equipment"
    TIME = "time"
    CUSTOM = "custom"

class OperatorType(enum.Enum):
    """Operators for conditional rules"""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"

class UserStatus(enum.Enum):
    """User authentication status"""
    GUEST = "guest"         # Created by someone else, no Clerk account
    VERIFIED = "verified"   # Has Clerk account and can log in

class ScriptStatus(enum.Enum):
    """Script workflow status"""
    DRAFT = "DRAFT"
    COPY = "COPY"
    WORKING = "WORKING"
    FINAL = "FINAL"
    BACKUP = "BACKUP"

# =============================================================================
# USER MODELS
# =============================================================================

class User(Base):
    """Unified user model supporting both guest and verified users"""
    __tablename__ = "userTable"
    
    # Primary key - CHANGED TO UUID
    userID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
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
    
    # Guest user management - CHANGED TO UUID
    createdBy = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=True)  # Who created this guest user
    invitedAt = Column(DateTime(timezone=True), nullable=True)  # When invitation was sent
    invitationToken = Column(String, unique=True, nullable=True)  # For invitation links
    
    # Internal notes (for guest users)
    notes = Column(Text, nullable=True)
    
    # Status and timestamps
    isActive = Column(Boolean, default=True)
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    shows = relationship("Show", back_populates="showOwner")
    crew_assignments = relationship("CrewAssignment", back_populates="user")
    
    # Guest user management relationships
    created_users = relationship("User", remote_side=[userID], backref="creator")
    
    # Crew relationship management
    managed_crew = relationship("CrewRelationship", foreign_keys="CrewRelationship.manager_user_id", back_populates="manager")
    managed_by = relationship("CrewRelationship", foreign_keys="CrewRelationship.crew_user_id", back_populates="crew_member")

class CrewRelationship(Base):
    """Many-to-many relationship for crew management"""
    __tablename__ = "crewRelationshipsTable"
    __table_args__ = (
        UniqueConstraint('manager_user_id', 'crew_user_id', name='unique_manager_crew'),
    )
    
    # Primary key - CHANGED TO UUID
    relationshipID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - CHANGED TO UUID
    manager_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)  # The verified user who manages
    crew_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)     # The user being managed
    
    # Status and metadata
    isActive = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    manager = relationship("User", foreign_keys=[manager_user_id], back_populates="managed_crew")
    crew_member = relationship("User", foreign_keys=[crew_user_id], back_populates="managed_by")

# =============================================================================
# VENUE MODELS
# =============================================================================

class Venue(Base):
    """Theater venue information"""
    __tablename__ = "venuesTable"
    
    # Primary key - CHANGED TO UUID
    venueID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    venueName = Column(String, nullable=False)  # Removed unique=True for user-scoped data
    
    # Owner - NEW FIELD
    ownerID = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)
    
    # Location Information
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    
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
    venueNotes = Column(Text, nullable=True)
    
    # Rental Information
    rentalRate = Column(Integer, nullable=True)  # Daily rate in dollars
    minimumRental = Column(Integer, nullable=True)  # Minimum rental amount
    
    # Timestamps
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[ownerID])
    shows = relationship("Show", back_populates="venue")

# =============================================================================
# DEPARTMENT MODELS
# =============================================================================

class Department(Base):
    """Theater departments (Sound, Lighting, etc.)"""
    __tablename__ = "departmentsTable"
    
    # Primary key - CHANGED TO UUID
    departmentID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    departmentName = Column(String, nullable=False)
    departmentDescription = Column(String, nullable=True)
    departmentColor = Column(String, nullable=True)  # e.g., "#FF5733"
    
    # Owner - NEW FIELD
    ownerID = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[ownerID])

# =============================================================================
# SHOW MODELS
# =============================================================================

class Show(Base):
    """Theater production/show"""
    __tablename__ = "showsTable"

    # Primary key - ALREADY UUID
    showID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core show information
    showName = Column(String, index=True, nullable=False)
    showDate = Column(DateTime(timezone=True), nullable=True)
    showDuration = Column(DateTime(timezone=True), nullable=True)  # End time of show
    showNotes = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign keys - CHANGED TO UUID
    venueID = Column(UUID(as_uuid=True), ForeignKey("venuesTable.venueID"), nullable=True)
    ownerID = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
    
    # Primary key - CHANGED TO UUID
    assignmentID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - CHANGED TO UUID
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"), nullable=False)
    userID = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)
    departmentID = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.departmentID"), nullable=False)
    
    # Show-specific role (may differ from user's general role)
    showRole = Column(String, nullable=True)  # e.g., "Head of Sound", "Assistant LD"
    
    # Assignment status and timestamps
    isActive = Column(Boolean, default=True, nullable=False)
    dateAssigned = Column(DateTime(timezone=True), server_default=func.now())
    
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
    
    # Primary key - CHANGED TO UUID
    scriptID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core script information
    scriptName = Column(String, nullable=False)
    scriptNotes = Column(Text, nullable=True)
    scriptStatus = Column(Enum(ScriptStatus), default=ScriptStatus.DRAFT, nullable=False)  # Updated to use enum with DRAFT default
    
    # Timing information
    startTime = Column(DateTime(timezone=True), nullable=True)
    endTime = Column(DateTime(timezone=True), nullable=True)  # Planned end time
    actualStartTime = Column(DateTime(timezone=True), nullable=True)
    
    # Status flags
    isPinned = Column(Boolean, default=False, nullable=False)
    
    # Foreign keys - ALREADY UUID
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"), nullable=False)
    
    # Owner - NEW FIELD (explicit ownership even though tied to show)
    ownerID = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[ownerID])
    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.sequence", cascade="all, delete-orphan")

class ScriptElement(Base):
    """Individual elements (cues, notes, etc.) within a script"""
    __tablename__ = "scriptElementsTable"
    __table_args__ = (
        Index('idx_scriptelement_script_order', 'scriptID', 'elementOrder'),
        Index('idx_script_sequence', 'scriptID', 'sequence'),
        Index('idx_script_time_ms', 'scriptID', 'timeOffsetMs'),
        Index('idx_department_elements', 'departmentID'),
        Index('idx_parent_element', 'parentElementID'),
        Index('idx_cue_id', 'cueID'),
        Index('idx_type_active', 'elementType', 'isActive'),
    )
    
    # Primary key - UUID
    elementID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - UUID
    scriptID = Column(UUID(as_uuid=True), ForeignKey("scriptsTable.scriptID"), nullable=False)
    departmentID = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.departmentID"), nullable=True)  # Nullable for notes
    parentElementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID"), nullable=True)
    createdBy = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=True)
    updatedBy = Column(UUID(as_uuid=True), ForeignKey("userTable.userID"), nullable=True)
    
    # Element information
    elementType = Column(Enum(ElementType), nullable=False)
    elementOrder = Column(Integer, nullable=True)  # Legacy field - made nullable for migration compatibility
    sequence = Column(Integer, nullable=True)  # New sequence field
    cueNumber = Column(String, nullable=True)  # Legacy field
    cueID = Column(String(50), nullable=True)  # New cue ID field
    elementDescription = Column(Text, nullable=True)  # Legacy field
    description = Column(Text, nullable=False, server_default='')  # New description field
    cueNotes = Column(Text, nullable=True)
    
    # Trigger and execution
    triggerType = Column(Enum(TriggerType), nullable=False, server_default='MANUAL')
    followsCueID = Column(String, nullable=True)
    executionStatus = Column(Enum(ExecutionStatus), nullable=False, server_default='PENDING')
    priority = Column(Enum(PriorityLevel), nullable=False, server_default='NORMAL')
    
    # Timing
    timeOffsetMs = Column(Integer, nullable=False, server_default='0')  # Timing in milliseconds
    duration = Column(Integer, nullable=True)  # Duration in milliseconds
    fadeIn = Column(Integer, nullable=True)  # Fade in time in milliseconds
    fadeOut = Column(Integer, nullable=True)  # Fade out time in milliseconds
    
    # Location and visual
    location = Column(Enum(LocationArea), nullable=True)
    locationDetails = Column(Text, nullable=True)
    departmentColor = Column(String(7), nullable=True)  # Hex color override
    customColor = Column(String(7), nullable=True)  # Custom color for element
    
    # Grouping and hierarchy
    groupLevel = Column(Integer, nullable=False, server_default='0')
    isCollapsed = Column(Boolean, nullable=False, server_default='false')
    
    # Safety and metadata
    isSafetyCritical = Column(Boolean, nullable=False, server_default='false')
    safetyNotes = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, server_default='1')
    
    # Status
    isActive = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    dateCreated = Column(DateTime(timezone=True), server_default=func.now())
    dateUpdated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    script = relationship("Script", back_populates="elements")
    department = relationship("Department")
    parent_element = relationship("ScriptElement", remote_side=[elementID], backref="child_elements")
    created_by_user = relationship("User", foreign_keys=[createdBy])
    updated_by_user = relationship("User", foreign_keys=[updatedBy])
    
    # Supporting table relationships
    equipment = relationship("ScriptElementEquipment", back_populates="element", cascade="all, delete-orphan")
    crew_assignments = relationship("ScriptElementCrewAssignment", back_populates="element", cascade="all, delete-orphan")
    performer_assignments = relationship("ScriptElementPerformerAssignment", back_populates="element", cascade="all, delete-orphan")
    conditional_rules = relationship("ScriptElementConditionalRule", back_populates="element", cascade="all, delete-orphan")
    group_relationships = relationship("ScriptElementGroup", foreign_keys="ScriptElementGroup.groupID", back_populates="group_element", cascade="all, delete-orphan")

# =============================================================================
# SCRIPT ELEMENT SUPPORTING MODELS
# =============================================================================

class ScriptElementEquipment(Base):
    """Equipment requirements for script elements"""
    __tablename__ = "scriptElementEquipment"
    
    # Composite primary key
    elementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), primary_key=True)
    equipmentName = Column(String(100), primary_key=True)
    
    # Equipment details
    isRequired = Column(Boolean, nullable=False, server_default='true')
    notes = Column(Text, nullable=True)
    
    # Relationships
    element = relationship("ScriptElement", back_populates="equipment")

class ScriptElementCrewAssignment(Base):
    """Crew assignments for script elements"""
    __tablename__ = "scriptElementCrewAssignments"
    
    # Composite primary key
    elementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), primary_key=True)
    crewID = Column(UUID(as_uuid=True), primary_key=True)  # Will link to User table when crew management is implemented
    
    # Assignment details
    assignmentRole = Column(String(100), nullable=True)
    isLead = Column(Boolean, nullable=False, server_default='false')
    
    # Relationships
    element = relationship("ScriptElement", back_populates="crew_assignments")

class ScriptElementPerformerAssignment(Base):
    """Performer assignments for script elements"""
    __tablename__ = "scriptElementPerformerAssignments"
    
    # Composite primary key
    elementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), primary_key=True)
    performerID = Column(UUID(as_uuid=True), primary_key=True)  # Will link to User/Performer table when implemented
    
    # Assignment details
    characterName = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    element = relationship("ScriptElement", back_populates="performer_assignments")

class ScriptElementConditionalRule(Base):
    """Conditional rules for script elements"""
    __tablename__ = "scriptElementConditionalRules"
    __table_args__ = (
        Index('idx_element_conditions', 'elementID'),
    )
    
    # Primary key
    ruleID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key
    elementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), nullable=False)
    
    # Rule definition
    conditionType = Column(Enum(ConditionType), nullable=False)
    operator = Column(Enum(OperatorType), nullable=False)
    conditionValue = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    isActive = Column(Boolean, nullable=False, server_default='true')
    
    # Relationships
    element = relationship("ScriptElement", back_populates="conditional_rules")

class ScriptElementGroup(Base):
    """Group relationships for script elements"""
    __tablename__ = "scriptElementGroups"
    __table_args__ = (
        Index('idx_group_order', 'groupID', 'orderInGroup'),
    )
    
    # Composite primary key
    groupID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), primary_key=True)
    childElementID = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.elementID", ondelete="CASCADE"), primary_key=True)
    
    # Group details
    orderInGroup = Column(Integer, nullable=False)
    
    # Relationships
    group_element = relationship("ScriptElement", foreign_keys=[groupID], back_populates="group_relationships")
    child_element = relationship("ScriptElement", foreign_keys=[childElementID])

