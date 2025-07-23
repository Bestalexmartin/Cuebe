# backend/routers/venues.py

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import logging

import models
import schemas
from database import get_db
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["venues"])


@router.get("/me/venues", response_model=list[schemas.Venue])
async def read_venues(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get venues owned by the current user."""
    venues = db.query(models.Venue).filter(models.Venue.ownerID == user.userID).all()
    return venues


@router.post("/me/venues", response_model=schemas.Venue, status_code=status.HTTP_201_CREATED)
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


@router.get("/venues/{venue_id}", response_model=schemas.Venue)
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


@router.patch("/venues/{venue_id}", response_model=schemas.Venue)
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


@router.delete("/venues/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
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