# backend/main.py

import json
import os
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import our custom modules
import models
import schemas
from database import get_db, engine

# This command is useful for initial development to ensure tables exist.
# In a robust production setup, Alembic would be the sole manager of the schema.
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#
# HEALTH CHECK
#
@app.get("/api/health")
def read_root():
    return {"status": "ok"}

#
# CREATE A NEW SHOW
#
@app.post("/api/shows/", response_model=schemas.Show) # <-- This must be @app.post
def create_show(show: schemas.ShowCreate, db: Session = Depends(get_db)):
    current_user_id = 1  # Placeholder

    new_show = models.Show(
        showName=show.showName,
        showVenue=show.showVenue,
        showDate=show.showDate,
        ownerID=current_user_id
    )
    
    db.add(new_show)
    db.commit()
    db.refresh(new_show)
    
    return new_show

#
# GET A LIST OF SHOWS
#
@app.get("/api/shows/", response_model=list[schemas.Show]) # <-- This is @app.get
def read_shows(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    shows = db.query(models.Show).offset(skip).limit(limit).all()
    return shows
