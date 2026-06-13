# backend/database.py

import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from config import settings

# Disable database logging for cleaner output
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

# DATABASE_URL from env (production/Render.com), else composed from POSTGRES_* (local dev)
DATABASE_URL = settings.resolved_database_url

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