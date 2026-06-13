# backend/models/script.py

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Boolean, Text, Index, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from .base import Base
from .enums import ScriptStatus, ElementType, PriorityLevel


class Script(Base):
    """Call script for a show"""
    __tablename__ = "scriptsTable"

    script_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Core script information
    script_name = Column(String, nullable=False)
    script_notes = Column(Text, nullable=True)
    script_status = Column(Enum(ScriptStatus), default=ScriptStatus.DRAFT, nullable=False)

    # Timing information
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)  # Planned end time
    actual_start_time = Column(DateTime(timezone=True), nullable=True)

    # Status flags
    is_shared = Column(Boolean, default=False, nullable=False)

    show_id = Column(UUID(as_uuid=True), ForeignKey("showsTable.show_id"), nullable=False)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=False)

    # Timestamps
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    date_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    show = relationship("Show", back_populates="scripts")
    elements = relationship("ScriptElement", back_populates="script", order_by="ScriptElement.sequence", cascade="all, delete-orphan")

class ScriptElement(Base):
    """Individual elements (cues, notes, etc.) within a script"""
    __tablename__ = "scriptElementsTable"
    __table_args__ = (
        Index('idx_script_sequence', 'script_id', 'sequence'),
        Index('idx_script_time_ms', 'script_id', 'offset_ms'),
        Index('idx_department_elements', 'department_id'),
        Index('idx_parent_element', 'parent_element_id'),
    )

    element_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    script_id = Column(UUID(as_uuid=True), ForeignKey("scriptsTable.script_id"), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departmentsTable.department_id"), nullable=True)  # Nullable for notes
    parent_element_id = Column(UUID(as_uuid=True), ForeignKey("scriptElementsTable.element_id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("userTable.user_id"), nullable=True)

    # Element information
    element_type = Column(Enum(ElementType), nullable=False)
    sequence = Column(Integer, nullable=True)  # New sequence field
    element_name = Column(Text, nullable=False, server_default='')  # Element name field
    cue_notes = Column(Text, nullable=True)

    # Timing and priority
    offset_ms = Column(Integer, nullable=False, server_default='0')  # Timing in milliseconds
    duration_ms = Column(Integer, nullable=True)  # Duration in milliseconds
    priority = Column(Enum(PriorityLevel), nullable=False, server_default='NORMAL')

    # Location and visual
    location_details = Column(Text, nullable=True)
    custom_color = Column(String(7), nullable=True)  # Custom color for element

    # Grouping and hierarchy
    group_level = Column(Integer, nullable=False, server_default='0')
    is_collapsed = Column(Boolean, nullable=False, server_default='false')

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
