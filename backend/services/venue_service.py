# backend/services/venue_service.py
#
# Business logic for venues. Routers stay thin and delegate here. This is the
# reference for the services/ layer (Blok 000c); other domains follow the same
# shape: functions take (db, user, ...), enforce ownership, and raise HTTPException
# for not-found.

from datetime import datetime
from uuid import UUID
import logging

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas

logger = logging.getLogger(__name__)


def list_venues(db: Session, user: models.User) -> list[models.Venue]:
    """Return venues owned by the user."""
    return db.query(models.Venue).filter(models.Venue.owner_id == user.user_id).all()


def create_venue(db: Session, user: models.User, venue: schemas.VenueCreate) -> models.Venue:
    """Create a new venue owned by the user."""
    venue_data = venue.model_dump()
    venue_data['owner_id'] = user.user_id
    new_venue = models.Venue(**venue_data)
    db.add(new_venue)
    db.commit()
    db.refresh(new_venue)
    return new_venue


def get_venue(db: Session, user: models.User, venue_id: UUID) -> models.Venue:
    """Return a single owned venue, or raise 404."""
    venue = db.query(models.Venue).filter(
        models.Venue.venue_id == venue_id,
        models.Venue.owner_id == user.user_id
    ).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    return venue


def update_venue(db: Session, user: models.User, venue_id: UUID, venue_update: schemas.VenueCreate) -> models.Venue:
    """Update an owned venue, or raise 404."""
    venue_to_update = get_venue(db, user, venue_id)

    update_data = venue_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(venue_to_update, key, value)

    # Update the date_updated timestamp
    venue_to_update.date_updated = datetime.utcnow()

    db.commit()
    db.refresh(venue_to_update)
    return venue_to_update


def delete_venue(db: Session, user: models.User, venue_id: UUID) -> None:
    """Delete an owned venue, nullifying venue references in the user's shows."""
    venue_to_delete = get_venue(db, user, venue_id)

    # First, nullify the venue_id in any shows that reference this venue (single statement)
    affected = db.query(models.Show).filter(
        models.Show.venue_id == venue_id,
        models.Show.owner_id == user.user_id  # Only update user's own shows
    ).update({
        models.Show.venue_id: None,
        models.Show.date_updated: func.now()
    }, synchronize_session=False)

    # Log the cleanup for debugging
    if affected:
        logger.info(f"Nullified venue reference for {affected} shows when deleting venue {venue_id}")

    # Now delete the venue
    db.delete(venue_to_delete)
    db.commit()
