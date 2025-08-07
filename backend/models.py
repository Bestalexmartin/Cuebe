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
    GROUP = "GROUP"

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
    SAFETY = "SAFETY"
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    OPTIONAL = "OPTIONAL"

class UserRole(enum.Enum):
    """User roles for crew members"""
    CREW = "crew"
    ASSISTANT_DIRECTOR = "assistant_director"
    STAGE_MANAGER = "stage_manager"
    ASSISTANT_STAGE_MANAGER = "assistant_stage_manager"
    TECHNICAL_DIRECTOR = "technical_director"
    LIGHTING_DESIGNER = "lighting_designer"
    SOUND_DESIGNER = "sound_designer"
    COSTUME_DESIGNER = "costume_designer"
    SET_DESIGNER = "set_designer"
    PROPS_MASTER = "props_master"
    ELECTRICIAN = "electrician"
    SOUND_TECHNICIAN = "sound_technician"
    WARDROBE = "wardrobe"
    MAKEUP_ARTIST = "makeup_artist"
    HAIR_STYLIST = "hair_stylist"
    CHOREOGRAPHER = "choreographer"
    MUSIC_DIRECTOR = "music_director"
    PRODUCER = "producer"
    DIRECTOR = "director"
    OTHER = "other"

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

# Removed unused enums: ConditionType, OperatorType

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
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Clerk integration (nullable for guest users)
    clerk_user_id = Column(String, unique=True, nullable=True, index=True)
    
    # Core user information
    email_address = Column(String, unique=True, nullable=False, index=True)
    fullname_first = Column(String, nullable=False)
    fullname_last = Column(String, nullable=False)
    
    # Optional fields
    user_name = Column(String, unique=True, nullable=True, index=True)
    profile_img_url = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # User status and role
    user_status = Column(Enum(UserStatus), default=UserStatus.VERIFIED, nullable=False)
    user_role = Column(String, default="admin")  # admin for verified users, crew for guests
    
    # Guest user management - CHANGED TO UUID
    created_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)  # Who created this guest user
    invited_at = Column(DateTime(timezone=True), nullable=True)  # When invitation was sent
    invitation_token = Column(String, unique=True, nullable=True)  # For invitation links
    
    # Internal notes (for guest users)
    notes = Column(Text, nullable=True)
    
    # User preferences and options
    user_prefs_json = Column(JSON, nullable=True)  # For complex preferences
    user_prefs_bitmap = Column(Integer, nullable=True, default=6)  # bitmap for boolean preferences
    
    # Status and timestamps
    is_active = Column(Boolean, default=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    shows = relationship("Show", back_populates="show_owner")
    crew_assignments = relationship("CrewAssignment", back_populates="user")
    
    # Guest user management relationships
    created_users = relationship("User", remote_side=[user_id], backref="creator")
    
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
    relationship_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - CHANGED TO UUID
    manager_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)  # The verified user who manages
    crew_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)     # The user being managed
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    notes = Column(Text, nullable=True)
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
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
    venue_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    venue_name = Column(String, nullable=False)  # Removed unique=True for user-scoped data
    
    # Owner - NEW FIELD
    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    
    # Location Information
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    
    # Venue Details
    capacity = Column(Integer, nullable=True)
    venue_type = Column(String, nullable=True)  # e.g., "Proscenium", "Thrust", "Arena", "Black Box"
    
    # Contact Information
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    
    # Technical Specifications (in feet)
    stage_width = Column(Integer, nullable=True)
    stage_depth = Column(Integer, nullable=True)
    fly_height = Column(Integer, nullable=True)
    
    # Equipment and Features (stored as JSON array)
    equipment = Column(JSON, nullable=True)  # e.g., ["Fly System", "Orchestra Pit", "Sound System"]
    
    # Additional Information
    venue_notes = Column(Text, nullable=True)
    
    # Rental Information
    rental_rate = Column(Integer, nullable=True)  # Daily rate in dollars
    minimum_rental = Column(Integer, nullable=True)  # Minimum rental amount
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    shows = relationship("Show", back_populates="venue")

# =============================================================================
# DEPARTMENT MODELS
# =============================================================================

class Department(Base):
    """Theater departments (Sound, Lighting, etc.)"""
    __tablename__ = "departmentsTable"
    
    # Primary key - CHANGED TO UUID
    department_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    department_name = Column(String, nullable=False)
    department_description = Column(String, nullable=True)
    department_color = Column(String, nullable=True)  # e.g., "#FF5733"
    department_initials = Column(String(5), nullable=True)  # e.g., "LX", "SND"
    
    # Owner - NEW FIELD
    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])

# =============================================================================
# SHOW MODELS
# =============================================================================

class Show(Base):
    """Theater production/show"""
    __tablename__ = "showsTable"

    # Primary key - ALREADY UUID
    show_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core show information
    show_name = Column(String, index=True, nullable=False)
    show_date = Column(DateTime(timezone=True), nullable=True)
    show_duration = Column(DateTime(timezone=True), nullable=True)  # End time of show
    show_notes = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Foreign keys - CHANGED TO UUID
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venuesTable.venue_id"), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    show_owner = relationship("User", back_populates="shows", foreign_keys=[owner_id])
    venue = relationship("Venue", back_populates="shows")
    scripts = relationship("Script", back_populates="show", cascade="all, delete-orphan")
    crew = relationship("CrewAssignment", back_populates="show", cascade="all, delete-orphan")

class CrewAssignment(Base):
    """Assignment of crew members to shows with specific departments and roles"""
    __tablename__ = "crewAssignmentsTable"
    __table_args__ = (
        UniqueConstraint('show_id', 'user_id', 'department_id', name='unique_user_show_dept'),
    )
    
    # Primary key - CHANGED TO UUID
    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - CHANGED TO UUID
    show_id = Column(UUID(as_uuid=True), ForeignKey("showsTable.show_id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.department_id"), nullable=False)
    
    # Show-specific role (may differ from user's general role)
    show_role = Column(String, nullable=True)  # e.g., "Head of Sound", "Assistant LD"
    
    # Assignment status and timestamps
    is_active = Column(Boolean, default=True, nullable=False)
    date_assigned = Column(DateTime(timezone=True), server_default=func.now())
    
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
    script_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core script information
    script_name = Column(String, nullable=False)
    script_notes = Column(Text, nullable=True)
    script_status = Column(Enum(ScriptStatus), default=ScriptStatus.DRAFT, nullable=False)  # Updated to use enum with DRAFT default
    
    # Timing information
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)  # Planned end time
    actual_start_time = Column(DateTime(timezone=True), nullable=True)
    
    # Status flags
    is_shared = Column(Boolean, default=False, nullable=False)
    
    # Foreign keys - ALREADY UUID
    show_id = Column(UUID(as_uuid=True), ForeignKey("showsTable.show_id"), nullable=False)
    
    # Owner - NEW FIELD (explicit ownership even though tied to show)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.sequence", cascade="all, delete-orphan")
    shares = relationship("ScriptShare", back_populates="script", cascade="all, delete-orphan")

class ScriptElement(Base):
    """Individual elements (cues, notes, etc.) within a script"""
    __tablename__ = "scriptElementsTable"
    __table_args__ = (
        Index('idx_script_sequence', 'script_id', 'sequence'),
        Index('idx_script_time_ms', 'script_id', 'time_offset_ms'),
        Index('idx_department_elements', 'department_id'),
        Index('idx_parent_element', 'parent_element_id'),
        Index('idx_cue_id', 'cue_id'),
        Index('idx_type_active', 'element_type', 'is_active'),
    )
    
    # Primary key - UUID
    element_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys - UUID
    script_id = Column(UUID(as_uuid=True), ForeignKey("scriptsTable.script_id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.department_id"), nullable=True)  # Nullable for notes
    parent_element_id = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.element_id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)
    
    # Element information
    element_type = Column(Enum(ElementType), nullable=False)
    sequence = Column(Integer, nullable=True)  # New sequence field
    cue_number = Column(String, nullable=True)  # Legacy field
    cue_id = Column(String(50), nullable=True)  # New cue ID field
    element_description = Column(Text, nullable=True)  # Legacy field
    description = Column(Text, nullable=False, server_default='')  # New description field
    cue_notes = Column(Text, nullable=True)
    
    # Trigger and execution
    trigger_type = Column(Enum(TriggerType), nullable=False, server_default='MANUAL')
    follows_cue_id = Column(String, nullable=True)
    execution_status = Column(Enum(ExecutionStatus), nullable=False, server_default='PENDING')
    priority = Column(Enum(PriorityLevel), nullable=False, server_default='NORMAL')
    
    # Timing
    time_offset_ms = Column(Integer, nullable=False, server_default='0')  # Timing in milliseconds
    duration = Column(Integer, nullable=True)  # Duration in milliseconds
    fade_in = Column(Integer, nullable=True)  # Fade in time in milliseconds
    fade_out = Column(Integer, nullable=True)  # Fade out time in milliseconds
    
    # Location and visual
    location = Column(Enum(LocationArea), nullable=True)
    location_details = Column(Text, nullable=True)
    department_color = Column(String(7), nullable=True)  # Hex color override
    custom_color = Column(String(7), nullable=True)  # Custom color for element
    
    # Grouping and hierarchy
    group_level = Column(Integer, nullable=False, server_default='0')
    is_collapsed = Column(Boolean, nullable=False, server_default='false')
    
    # Metadata
    version = Column(Integer, nullable=False, server_default='1')
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    script = relationship("Script", back_populates="elements")
    department = relationship("Department")
    parent_element = relationship("ScriptElement", remote_side=[element_id], backref="child_elements")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    
    # Supporting table relationships (removed - unused features)

# =============================================================================
# SCRIPT SHARING MODELS
# =============================================================================

class ScriptShare(Base):
    """
    Script sharing tokens for secure crew access to read-only script views
    Each share is for a specific crew member assigned to the show
    """
    __tablename__ = "script_shares"
    
    # Primary key
    share_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys
    script_id = Column(UUID(as_uuid=True), ForeignKey("scriptsTable.script_id"), nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False, index=True)
    
    # Sharing token and access
    share_token = Column(String(255), unique=True, nullable=False, index=True)
    
    # Permissions
    permissions = Column(JSON, nullable=True, default=lambda: {"view": True, "download": False})
    
    # Expiration and status
    expires_at = Column(DateTime(timezone=True), nullable=True)  # null = never expires
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Usage tracking
    access_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_by_ip = Column(String(45), nullable=True)  # IPv6 support
    
    # Metadata
    share_name = Column(String(255), nullable=True)  # Optional name for management
    notes = Column(Text, nullable=True)  # Internal notes about this share
    
    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    script = relationship("Script", back_populates="shares")
    created_by_user = relationship("User", foreign_keys=[created_by])
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])


# =============================================================================
# SCRIPT ELEMENT SUPPORTING MODELS (REMOVED - UNUSED FEATURES)
# =============================================================================
# These models were removed as they were unused features:
# - ScriptElementEquipment
# - ScriptElementCrewAssignment  
# - ScriptElementPerformerAssignment
# - ScriptElementConditionalRule
# - ScriptElementGroup

