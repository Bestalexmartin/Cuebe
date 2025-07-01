# backend/models.py

from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

# Create a base class for our models to inherit from
Base = declarative_base()

class User(Base):
    __tablename__ = "userTable"

    # Your application's own unique ID for the user
    ID = Column(Integer, primary_key=True, index=True)

    # The essential link to Clerk's user management system
    clerk_user_id = Column(String, unique=True, nullable=False, index=True)

    # "Cached" data from Clerk for convenience
    userName = Column(String, unique=True, index=True)
    emailAddress = Column(String, unique=True, index=True)
    fullnameFirst = Column(String)
    fullnameLast = Column(String)
    profileImgURL = Column(String)
    userRole = Column(String, default="admin")  # Default role is 'user'

    # Timestamps managed by your database
    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # This creates the "one-to-many" relationship from User to Show
    shows = relationship("Show", back_populates="owner")


class Show(Base):
    __tablename__ = "showsTable"

    showID = Column(Integer, primary_key=True, index=True)
    showName = Column(String, index=True, nullable=False)
    showVenue = Column(String)
    showDate = Column(Date)

    # This is the foreign key linking a Show back to its User
    ownerID = Column(Integer, ForeignKey("userTable.ID"))

    # This creates the "many-to-one" relationship from Show to User
    showOwner = relationship("userTable", back_populates="showsTable")

    dateCreated = Column(DateTime, server_default=func.now())
    dateUpdated = Column(DateTime, server_default=func.now(), onupdate=func.now())