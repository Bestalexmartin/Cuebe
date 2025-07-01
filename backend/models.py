# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

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
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # No changes needed here, but we've updated the other side
    shows = relationship("Show", back_populates="showOwner")


class Show(Base):
    __tablename__ = "showsTable"

    showID = Column(Integer, primary_key=True, index=True)
    showName = Column(String, index=True, nullable=False)
    showVenue = Column(String)
    showDate = Column(Date)
    
    # This defines the column name as 'ownerID' in this table.
    # It correctly points to the 'ID' column in 'userTable'.
    ownerID = Column(Integer, ForeignKey("userTable.ID"))

    # By adding foreign_keys, we explicitly tell the relationship which column to use for the join.
    showOwner = relationship("User", back_populates="shows", foreign_keys=[ownerID])

    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())