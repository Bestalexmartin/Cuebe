# backend/database.py

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Enable comprehensive database logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

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

@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    # Only log preferences-related queries and critical operations
    if ("userTable" in statement and "preferences" in statement) or \
       ("DELETE" in statement.upper()) or \
       ("preferences" in statement.lower()):
        logger.info(f"🔍 SQL EXECUTE: {statement}")
        if parameters:
            logger.info(f"🔍 SQL PARAMS: {parameters}")

@event.listens_for(engine, "commit")
def receive_commit(conn):
    # Keep commit logging for tracking transactions
    logger.info("✅ DATABASE COMMIT")

@event.listens_for(engine, "rollback") 
def receive_rollback(conn):
    # Keep rollback logging for debugging transaction issues
    logger.info("❌ DATABASE ROLLBACK")

# Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()