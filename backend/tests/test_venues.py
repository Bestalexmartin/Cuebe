"""Tests for the venues router endpoints."""
import pytest
from uuid import uuid4


class TestGetVenues:
    """Tests for GET /api/me/venues"""

    def test_get_my_venues_returns_list(self, test_client):
        """Getting my venues should return a list."""
        response = test_client.get("/api/me/venues")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_my_venues_no_auth_fails(self, test_client_no_auth):
        """Getting venues without auth should return 403."""
        response = test_client_no_auth.get("/api/me/venues")
        assert response.status_code == 401


class TestGetVenue:
    """Tests for GET /api/venues/{venue_id}"""

    def test_get_nonexistent_venue_returns_404(self, test_client):
        """Getting a nonexistent venue should return 404."""
        fake_id = uuid4()
        response = test_client.get(f"/api/venues/{fake_id}")
        assert response.status_code == 404

    def test_get_venue_invalid_uuid_returns_422(self, test_client):
        """Getting a venue with invalid UUID should return 422."""
        response = test_client.get("/api/venues/not-a-uuid")
        assert response.status_code == 422


class TestCreateVenue:
    """Tests for POST /api/me/venues"""

    def test_create_venue_success(self, test_client):
        """Creating a venue should return the new venue."""
        response = test_client.post(
            "/api/me/venues",
            json={
                "venue_name": "Test Theater",
                "venue_address": "123 Main St"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["venue_name"] == "Test Theater"
        assert "venue_id" in data

    def test_create_venue_minimal(self, test_client):
        """Creating a venue with minimal data should work."""
        response = test_client.post(
            "/api/me/venues",
            json={"venue_name": "Minimal Venue"}
        )
        assert response.status_code == 201


class TestVenueIntegration:
    """Integration tests for venue operations."""

    def test_venue_lifecycle(self, test_client):
        """Test creating, reading, updating, and deleting a venue."""
        # Create
        create_response = test_client.post(
            "/api/me/venues",
            json={"venue_name": "Lifecycle Venue"}
        )
        assert create_response.status_code == 201
        venue_id = create_response.json()["venue_id"]

        # Read
        get_response = test_client.get(f"/api/venues/{venue_id}")
        assert get_response.status_code == 200
        assert get_response.json()["venue_name"] == "Lifecycle Venue"

        # Update
        update_response = test_client.patch(
            f"/api/venues/{venue_id}",
            json={"venue_name": "Updated Venue"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["venue_name"] == "Updated Venue"

        # Delete
        delete_response = test_client.delete(f"/api/venues/{venue_id}")
        assert delete_response.status_code == 204

        # Verify deleted
        verify_response = test_client.get(f"/api/venues/{venue_id}")
        assert verify_response.status_code == 404
