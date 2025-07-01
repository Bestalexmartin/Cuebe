# backend/main.py

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Import our custom modules
import models
import schemas
from database import get_db, engine

# This command ensures tables are created (useful for initial dev)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# This is for development, to allow your React frontend
# to talk to your backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # The default port for Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    return {"status": "ok"}

#
# CREATE A NEW SHOW
#
@app.post("/api/shows/", response_model=schemas.Show)
def create_show(show: schemas.ShowCreate, db: Session = Depends(get_db)):
    # Placeholder for the logged-in user's ID from your userTable
    # We will replace this with real Clerk user data later
    current_user_id = 1 

    # Create a new SQLAlchemy Show model instance using your column names
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
# GET A LIST OF SHOWS (with Pagination)
#
@app.get("/api/shows/", response_model=list[schemas.Show])
def read_shows(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Query the database for shows
    shows = db.query(models.Show).offset(skip).limit(limit).all()
    return shows