# backend/routers/venues.py

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from uuid import UUID
import logging

import models
import schemas
from database import get_db
from services import venue_service
from .auth import get_current_user

from utils.rate_limiter import RATE_LIMITING_AVAILABLE, RateLimitConfig, rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["venues"])


@router.get("/me/venues", response_model=list[schemas.Venue])
def list_venues(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get venues owned by the current user."""
    return venue_service.list_venues(db, user)


@router.post("/me/venues", response_model=schemas.Venue, status_code=status.HTTP_201_CREATED)
def create_venue(
    venue: schemas.VenueCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new venue owned by the current user."""
    return venue_service.create_venue(db, user, venue)


@router.get("/venues/{venue_id}", response_model=schemas.Venue)
def get_venue(
    venue_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single venue by ID (must be owned by current user)."""
    return venue_service.get_venue(db, user, venue_id)


@router.patch("/venues/{venue_id}", response_model=schemas.Venue)
def update_venue(
    venue_id: UUID,
    venue_update: schemas.VenueCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a venue."""
    return venue_service.update_venue(db, user, venue_id, venue_update)


@router.delete("/venues/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue(
    venue_id: UUID,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a venue and nullify venue references in shows."""
    venue_service.delete_venue(db, user, venue_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
