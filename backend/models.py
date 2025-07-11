# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func, Boolean, Text, Interval, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
import uuid

Base = declarative_base()

# --- MANY-TO-MANY ASSOCIATION TABLE ---
# This table links a User (as a Crew member) to a Show for a specific Department.
class CrewAssignment(Base):
    __tablename__ = "crewAssignmentsTable"
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

class Show(Base):
    __tablename__ = "showsTable"

    showID = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4(), default=uuid.uuid4)

    showName = Column(String, index=True, nullable=False)
    showVenue = Column(String)
    showDate = Column(Date)
    ownerID = Column(Integer, ForeignKey("userTable.ID"))
    showOwner = relationship("User", back_populates="shows", foreign_keys=[ownerID])
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    scripts = relationship("Script", back_populates="show", cascade="all, delete-orphan")
    crew = relationship("CrewAssignment", back_populates="show", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departmentsTable"
    departmentID = Column(Integer, primary_key=True, index=True)
    departmentName = Column(String, nullable=False)
    departmentDescription = Column(String)
    departmentColor = Column(String) # e.g., "#FF5733"
    # Note: Department head logic is handled by the CrewAssignment table

class Script(Base):
    __tablename__ = "scriptsTable"
    scriptID = Column(Integer, primary_key=True, index=True)
    scriptName = Column(String, nullable=False)
    scriptStatus = Column(String, default="live")
    intendedStartTime = Column(DateTime(timezone=True))
    actualStartTime = Column(DateTime(timezone=True), nullable=True)
    scriptStatus = Column(String, default="ready") # e.g., 'ready', 'running', 'paused', 'done'
    isPinned = Column(Boolean, default=False, nullable=False)
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # UPDATE THE FOREIGN KEY TO POINT TO THE UUID COLUMN
    showID = Column(UUID(as_uuid=True), ForeignKey("showsTable.showID"))

    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.elementOrder")

    intendedStartTime = Column(DateTime(timezone=True))
    actualStartTime = Column(DateTime(timezone=True), nullable=True)
    scriptStatus = Column(String, default="ready") # e.g., 'ready', 'running', 'paused', 'done'

class ScriptElement(Base):
    __tablename__ = "scriptElementsTable"
    
    elementID = Column(Integer, primary_key=True, index=True)
    scriptID = Column(Integer, ForeignKey("scriptsTable.scriptID"))
    departmentID = Column(Integer, ForeignKey("departmentsTable.departmentID"), nullable=True)
    
    elementType = Column(String) 
    elementOrder = Column(Integer, nullable=False)
    
    cueNumber = Column(String)
    elementDescription = Column(Text)
    
    # This should be the only time-related column
    timeOffset = Column(Interval, nullable=False)

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