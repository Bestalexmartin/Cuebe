# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func, Boolean, Text, Interval, UniqueConstraint, Index, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

Base = declarative_base()

# Define the enum for element types
class ElementType(enum.Enum):
    CUE = "cue"
    NOTE = "note"
    MARKER = "marker"
    STANDBY = "standby"
    WARNING = "warning"

# --- MANY-TO-MANY ASSOCIATION TABLE ---
# This table links a User (as a Crew member) to a Show for a specific Department.
class CrewAssignment(Base):
    __tablename__ = "crewAssignmentsTable"
    __table_args__ = (UniqueConstraint('showID', 'userID', 'departmentID'),)
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"))
    userID = Column(Integer, ForeignKey("userTable.ID"), primary_key=True)
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), primary_key=True)
    

    # Relationships to easily access the objects
    user = relationship("User")
    department = relationship("Department")
    show = relationship("Show", back_populates="crew")

class User(Base):
    __tablename__ = "userTable"
    ID = Column(Integer, primary_key=True, index=True)
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)
    userName = Column(String, unique=True, index=True)
    emailAddress = Column(String, unique=True, index=True)
    fullnameFirst = Column(String)
    fullnameLast = Column(String)
    profileImgURL = Column(String)
    userRole = Column(String, default="admin")
    isActive = Column(Boolean, default=True)
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    shows = relationship("Show", back_populates="showOwner")

# Update your Venue model in models.py

class Venue(Base):
    __tablename__ = "venuesTable"
    
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

class Show(Base):
    __tablename__ = "showsTable"

    showID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    showName = Column(String, index=True, nullable=False)
    showDate = Column(Date)
    venueID = Column(Integer, ForeignKey("venuesTable.venueID"), nullable=True) # <-- CHANGED
    showNotes = Column(Text, nullable=True) # <-- NEW
    deadline = Column(DateTime, nullable=True) # <-- NEW
    ownerID = Column(Integer, ForeignKey("userTable.ID"))
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    showOwner = relationship("User", back_populates="shows", foreign_keys=[ownerID])
    venue = relationship("Venue", back_populates="shows")
    scripts = relationship("Script", back_populates="show", cascade="all, delete-orphan")
    crew = relationship("CrewAssignment", back_populates="show", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departmentsTable"
    departmentID = Column(Integer, primary_key=True, index=True)
    departmentName = Column(String, nullable=False)
    departmentDescription = Column(String)
    departmentColor = Column(String) # e.g., "#FF5733"
    # Note: Department head logic is handled by the CrewAssignment table
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Script(Base):
    __tablename__ = "scriptsTable"
    scriptID = Column(Integer, primary_key=True, index=True)
    scriptName = Column(String, nullable=False)
    scriptStatus = Column(String, default="ready") # e.g., 'ready', 'running', 'paused', 'done'
    intendedStartTime = Column(DateTime(timezone=True))
    actualStartTime = Column(DateTime(timezone=True), nullable=True)
    isPinned = Column(Boolean, default=False, nullable=False)
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # UPDATE THE FOREIGN KEY TO POINT TO THE UUID COLUMN
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"))

    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.elementOrder")

class ScriptElement(Base):
    __tablename__ = "scriptElementsTable"
    __table_args__ = (
        Index('idx_scriptelement_timeoffset', 'timeOffset'),
        Index('idx_scriptelement_script_order', 'scriptID', 'elementOrder'),
    )
    
    elementID = Column(Integer, primary_key=True, index=True)
    scriptID = Column(Integer, ForeignKey("scriptsTable.scriptID"))
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=True)
    
    elementType = Column(Enum(ElementType), nullable=False)
    elementOrder = Column(Integer, nullable=False)
    
    cueNumber = Column(String)
    elementDescription = Column(Text)
    
    # This should be the only time-related column
    timeOffset = Column(Interval, nullable=False)
    
    # For temporarily disabling elements without deleting them
    isActive = Column(Boolean, default=True, nullable=False)

    # Relationships
    script = relationship("Script", back_populates="elements")
    department = relationship("Department")

class GuestAccessLink(Base):
    __tablename__ = "guestAccessLinksTable"
    linkID = Column(Integer, primary_key=True, index=True)
    
    # A long, random, unguessable string we will generate
    accessToken = Column(String, unique=True, index=True, nullable=False)
    
    # What show and department this link gives access to
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"))
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=False)

    # Optional: A name for the link and an expiration date
    linkName = Column(String) # e.g., "Guest Mic 1"
    expiresAt = Column(DateTime, nullable=True)
    
    dateCreated = Column(DateTime, server_default=func.now())

    # Relationships
    show = relationship("Show")
    department = relationship("Department")