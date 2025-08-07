# backend/tests/conftest.py

import os
import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from faker import Faker

# Import your app and database setup
from main import app
from database import get_db
from models import Base, User, Venue, Department, Show, Script, CrewRelationship

# Set test environment variables
os.environ["POSTGRES_USER"] = "test_user"
os.environ["POSTGRES_PASSWORD"] = "test_password"
os.environ["POSTGRES_DB"] = "test_Cuebe"

# Use SQLite for tests to avoid PostgreSQL setup complexity
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

fake = Faker()

def override_get_db():
    db = None
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        if db is not None:
            db.close()

# Override the dependency
app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI test client with clean database"""
    return TestClient(app)

@pytest.fixture
def mock_user_data():
    """Generate realistic test user data"""
    return {
        "email_address": fake.email(),
        "fullname_first": fake.first_name(),
        "fullname_last": fake.last_name(),
        "clerk_user_id": fake.uuid4(),
        "user_status": "verified"
    }

@pytest.fixture
def mock_venue_data():
    """Generate realistic test venue data"""
    return {
        "name": fake.company(),
        "city": fake.city(),
        "state": fake.state_abbr(),
        "address": fake.address(),
        "website": fake.url(),
        "contact_name": fake.name(),
        "contact_phone": fake.phone_number(),
        "contact_email": fake.email()
    }

@pytest.fixture
def create_test_user(db_session):
    """Factory to create test users"""
    def _create_user(user_data=None):
        if user_data is None:
            user_data = {
                "email_address": fake.email(),
                "fullname_first": fake.first_name(),
                "fullname_last": fake.last_name(),
                "clerk_user_id": fake.uuid4(),
                "user_status": "verified"
            }
        
        user = User(**user_data)
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    return _create_user

@pytest.fixture
def create_test_venue(db_session):
    """Factory to create test venues"""
    def _create_venue(owner_id, venue_data=None):
        if venue_data is None:
            venue_data = {
                "name": fake.company(),
                "city": fake.city(),
                "state": fake.state_abbr()
            }
        
        venue_data["owner_id"] = owner_id
        venue = Venue(**venue_data)
        db_session.add(venue)
        db_session.commit()
        db_session.refresh(venue)
        return venue
    
    return _create_venue

@pytest.fixture
def auth_headers():
    """Mock authentication headers for testing"""
    # In a real implementation, you'd create valid JWTs
    # For now, we'll mock the authentication middleware
    return {"Authorization": "Bearer mock_token"}

@pytest.fixture
def mock_clerk_user():
    """Mock Clerk user data structure"""
    return {
        "id": fake.uuid4(),
        "email_addresses": [{"email_address": fake.email()}],
        "first_name": fake.first_name(),
        "last_name": fake.last_name(),
        "created_at": fake.unix_time(),
        "updated_at": fake.unix_time()
    }