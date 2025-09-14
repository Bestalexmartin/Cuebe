# backend/database.py

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Disable database logging for cleaner output
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# Check if DATABASE_URL is provided (for production/Render.com)
DATABASE_URL = os.getenv("DATABASE_URL")

# If no DATABASE_URL, construct it from individual components (for local development)
if not DATABASE_URL:
    DATABASE_URL = "postgresql://{user}:{password}@{host}:{port}/{db}".format(
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host="db",
        port="5432",
        db=os.getenv("POSTGRES_DB"),
    )

engine = create_engine(
    DATABASE_URL,
    echo=False,  # Disable verbose SQL logging for performance
    echo_pool=False,  # Disable connection pool logging
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Additional event listener for detailed transaction logging
logger = logging.getLogger(__name__)

# Database event logging disabled for cleaner output

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()