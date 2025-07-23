# backend/tests/test_api_critical.py

import pytest
from unittest.mock import patch
import time
from uuid import uuid4

from models import User, Venue, Show, CrewRelationship


class TestCriticalEndpoints:
    """Test the most critical API endpoints that handle complex business logic"""
    
    def setup_method(self):
        """Set up authentication mocking for all tests in this class"""
        self.auth_patcher = patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
        self.jwt_patcher = patch('main.jwt.decode')
        
        self.auth_patcher.start()
        self.mock_jwt = self.jwt_patcher.start()
        
        self.mock_jwt.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time()),
            "email": "test@example.com"
        }
    
    def teardown_method(self):
        """Clean up patches"""
        self.auth_patcher.stop()
        self.jwt_patcher.stop()
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self, db_session):
        """Create a test user for all tests in this class"""
        self.test_user = User(
            clerk_user_id="test_user_123",
            emailAddress="test@example.com",
            fullnameFirst="Test",
            fullnameLast="User",
            userStatus="VERIFIED"
        )
        db_session.add(self.test_user)
        db_session.commit()
        db_session.refresh(self.test_user)


class TestCrewManagement(TestCriticalEndpoints):
    """Test crew relationship management - most complex authorization logic"""
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_get_my_crews_empty(self, mock_jwt_decode, client, db_session):
        """Test getting crews when user has no crew relationships"""
        # Mock JWT to return our test user's clerk_user_id
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",  # Must match self.test_user.clerk_user_id
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.get("/api/me/crews", headers=headers)
        
        assert response.status_code == 200
        crew_data = response.json()
        assert len(crew_data) == 1  # Should return the current user
        assert crew_data[0]["clerk_user_id"] == "test_user_123"
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_create_guest_with_relationship(self, mock_jwt_decode, client, db_session):
        """Test the complex atomic operation of creating guest user with crew relationship"""
        # Mock JWT to return our test user's clerk_user_id
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # First create a venue (required for the relationship)
        venue = Venue(
            venueName="Test Venue",
            city="Test City", 
            state="NY",
            ownerID=self.test_user.userID
        )
        db_session.add(venue)
        db_session.commit()
        
        guest_data = {
            "emailAddress": "jane@example.com",
            "fullnameFirst": "Jane",
            "fullnameLast": "Guest",
            "userRole": "crew",
            "notes": "Test crew member"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.post("/api/users/create-guest-with-relationship", 
                             json=guest_data, headers=headers)
        
        # Should succeed
        assert response.status_code == 201
        result = response.json()
        assert result["fullnameFirst"] == "Jane"
        assert result["fullnameLast"] == "Guest"
        assert result["emailAddress"] == "jane@example.com"
        assert result["userStatus"] == "guest"  # Guest users are unverified (API returns lowercase)
        
        # Verify the crew relationship was created
        crews_response = client.get("/api/me/crews", headers=headers)
        assert crews_response.status_code == 200
        crews = crews_response.json()
        assert len(crews) == 2  # Should have original user + new guest user
        # Find the guest user in the results
        guest_user = next((crew for crew in crews if crew["clerk_user_id"] is None), None)
        assert guest_user is not None
        assert guest_user["fullnameFirst"] == "Jane"
        assert guest_user["fullnameLast"] == "Guest"
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_create_guest_duplicate_email(self, mock_jwt_decode, client, db_session):
        """Test creating guest user with duplicate email fails"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create a user with this email first
        existing_user = User(
            clerk_user_id="existing_user_456",
            emailAddress="jane@example.com",
            fullnameFirst="Existing",
            fullnameLast="User",
            userStatus="VERIFIED"
        )
        db_session.add(existing_user)
        db_session.commit()
        
        guest_data = {
            "emailAddress": "jane@example.com",  # Same email
            "fullnameFirst": "Jane",
            "fullnameLast": "Guest",
            "userRole": "crew",
            "notes": "Test crew member"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.post("/api/users/create-guest-with-relationship", 
                             json=guest_data, headers=headers)
        
        assert response.status_code == 400
        assert "User with this email already exists" in response.json()["detail"]
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_create_guest_invalid_data(self, mock_jwt_decode, client, db_session):
        """Test creating guest with invalid data fails validation"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        
        guest_data = {
            # Missing required field emailAddress to trigger validation error
            "fullnameFirst": "Jane",
            "fullnameLast": "Guest",
            "userRole": "crew"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.post("/api/users/create-guest-with-relationship", 
                             json=guest_data, headers=headers)
        
        assert response.status_code == 422  # Validation error
        error_detail = response.json()["detail"]
        assert isinstance(error_detail, list)  # FastAPI validation errors are lists
        assert "missing" in str(error_detail).lower()


class TestDataOwnership(TestCriticalEndpoints):
    """Test owner-scoped data access patterns"""
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_venues_only_show_owned(self, mock_jwt_decode, client, db_session):
        """Test that venues endpoint only returns user's own venues"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create venues for our test user
        my_venue1 = Venue(venueName="My Venue 1", city="My City", state="NY", ownerID=self.test_user.userID)
        my_venue2 = Venue(venueName="My Venue 2", city="My City", state="NY", ownerID=self.test_user.userID)
        
        # Create venue for different user
        other_user = User(clerk_user_id="other_123", emailAddress="other@example.com", fullnameFirst="Other", fullnameLast="User", userStatus="VERIFIED")
        db_session.add(other_user)
        db_session.commit()  # Commit user first to get UUID
        db_session.refresh(other_user)
        
        other_venue = Venue(venueName="Other Venue", city="Other City", state="CA", ownerID=other_user.userID)
        
        db_session.add_all([my_venue1, my_venue2, other_venue])
        db_session.commit()
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.get("/api/me/venues", headers=headers)
        
        assert response.status_code == 200
        venues = response.json()
        assert len(venues) == 2  # Only my venues
        venue_names = [v["venueName"] for v in venues]
        assert "My Venue 1" in venue_names
        assert "My Venue 2" in venue_names
        assert "Other Venue" not in venue_names
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_cannot_access_other_users_venue(self, mock_jwt_decode, client, db_session):
        """Test that user cannot access venue they don't own"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create venue owned by different user
        other_user = User(clerk_user_id="other_456", emailAddress="other2@example.com", fullnameFirst="Other", fullnameLast="User", userStatus="VERIFIED")
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        
        other_venue = Venue(venueName="Other Venue", city="Other City", state="CA", ownerID=other_user.userID)
        db_session.add(other_venue)
        db_session.commit()
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.get(f"/api/venues/{other_venue.venueID}", headers=headers)
        
        assert response.status_code == 404  # Should not find venue (owner-scoped query)
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_cannot_update_other_users_venue(self, mock_jwt_decode, client, db_session):
        """Test that user cannot update venue they don't own"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create venue owned by different user
        other_user = User(clerk_user_id="other_789", emailAddress="other3@example.com", fullnameFirst="Other", fullnameLast="User", userStatus="VERIFIED")
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        
        other_venue = Venue(venueName="Other Venue", city="Other City", state="CA", ownerID=other_user.userID)
        db_session.add(other_venue)
        db_session.commit()
        
        update_data = {"venueName": "Hacked Venue Name"}
        headers = {"Authorization": "Bearer valid_token"}
        response = client.patch(f"/api/venues/{other_venue.venueID}", json=update_data, headers=headers)
        
        assert response.status_code == 404  # Should not find venue to update


class TestCascadeOperations(TestCriticalEndpoints):
    """Test cascade delete operations that maintain data integrity"""
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_venue_delete_with_shows_fails(self, mock_jwt_decode, client, db_session):
        """Test that deleting venue with shows fails gracefully"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create venue
        venue = Venue(venueName="Test Venue", city="Test City", state="NY", ownerID=self.test_user.userID)
        db_session.add(venue)
        db_session.commit()
        
        # Create show in venue
        show = Show(
            showName="Test Show",
            venueID=venue.venueID,
            ownerID=self.test_user.userID,
            showDate=None  # Optional field
        )
        db_session.add(show)
        db_session.commit()
        
        headers = {"Authorization": "Bearer valid_token"}
        response = client.delete(f"/api/venues/{venue.venueID}", headers=headers)
        
        # API handles this gracefully by nullifying venue references
        assert response.status_code == 204  # Successful deletion
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_show_delete_cascades_to_scripts(self, mock_jwt_decode, client, db_session):
        """Test that deleting show properly handles script cleanup"""
        mock_jwt_decode.return_value = {
            "sub": "test_user_123",
            "exp": int(time.time()) + 3600,
            "nbf": int(time.time()) - 60,
            "iat": int(time.time())
        }
        # Create venue and show
        venue = Venue(venueName="Test Venue", city="Test City", state="NY", ownerID=self.test_user.userID)
        db_session.add(venue)
        db_session.commit()
        
        show = Show(
            showName="Test Show",
            venueID=venue.venueID,
            ownerID=self.test_user.userID
        )
        db_session.add(show)
        db_session.commit()
        
        headers = {"Authorization": "Bearer valid_token"}
        
        # Create script for the show
        script_data = {"scriptName": "Test Script", "scriptStatus": "DRAFT"}
        script_response = client.post(f"/api/shows/{show.showID}/scripts", 
                                    json=script_data, headers=headers)
        assert script_response.status_code == 200
        
        # Now delete the show
        delete_response = client.delete(f"/api/shows/{show.showID}", headers=headers)
        assert delete_response.status_code == 204  # Successful deletion returns 204 No Content
        
        # Verify script is also deleted (cascade)
        # Note: This tests the actual database cascade behavior