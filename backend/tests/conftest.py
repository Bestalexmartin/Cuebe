import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime, timezone


@pytest.fixture(scope="function")
def db_session():
    """Get a database session for tests that need direct DB access."""
    from database import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def mock_user_id():
    """Generate a consistent test user ID."""
    return uuid4()


@pytest.fixture
def mock_clerk_id():
    """Generate a consistent test Clerk ID."""
    return "user_test_" + str(uuid4())[:8]


@pytest.fixture
def mock_user(mock_user_id, mock_clerk_id, db_session):
    """Create a mock User object in the database for testing."""
    from models import User, UserStatus

    # Use unique email per test to avoid conflicts
    unique_email = f"test_{str(mock_user_id)[:8]}@example.com"

    user = User(
        user_id=mock_user_id,
        clerk_user_id=mock_clerk_id,
        email_address=unique_email,
        fullname_first="Test",
        fullname_last="User",
        user_status=UserStatus.VERIFIED,
        user_role="director",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    yield user

    # Cleanup - delete test data created during test
    try:
        from models import Show, Venue, Department
        # Delete departments owned by this user first (may be referenced by script elements)
        db_session.query(Department).filter(Department.owner_id == mock_user_id).delete()
        # Delete venues owned by this user
        db_session.query(Venue).filter(Venue.owner_id == mock_user_id).delete()
        # Delete shows owned by this user (cascades to scripts and elements)
        db_session.query(Show).filter(Show.owner_id == mock_user_id).delete()
        # Delete the user
        db_session.query(User).filter(User.user_id == mock_user_id).delete()
        db_session.commit()
    except Exception:
        db_session.rollback()


@pytest.fixture
def test_client(mock_user):
    """Create a test client with mocked authentication."""
    from main import app
    from routers.auth import get_current_user

    def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()


@pytest.fixture
def test_client_no_auth():
    """Create a test client without authentication override."""
    from main import app

    app.dependency_overrides.clear()
    return TestClient(app)
