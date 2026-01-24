"""Tests for the shows router endpoints."""
import pytest
from uuid import uuid4


class TestCreateShow:
    """Tests for POST /api/shows/"""

    def test_create_show_success(self, test_client):
        """Creating a show should return 200 with show data."""
        response = test_client.post(
            "/api/shows/",
            json={"show_name": "My New Show"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["show_name"] == "My New Show"
        assert "show_id" in data
        assert "owner_id" in data

    def test_create_show_with_notes(self, test_client):
        """Creating a show with notes should work."""
        response = test_client.post(
            "/api/shows/",
            json={
                "show_name": "Complete Show",
                "show_notes": "Some notes about the show",
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["show_name"] == "Complete Show"
        assert data["show_notes"] == "Some notes about the show"

    def test_create_show_creates_default_script(self, test_client):
        """Creating a show should also create a default draft script."""
        response = test_client.post(
            "/api/shows/",
            json={"show_name": "Show With Script"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "scripts" in data
        assert len(data["scripts"]) == 1
        assert data["scripts"][0]["script_name"] == "First Draft"

    def test_create_show_no_auth_fails(self, test_client_no_auth):
        """Creating a show without auth should return 403."""
        response = test_client_no_auth.post(
            "/api/shows/",
            json={"show_name": "Unauthorized Show"}
        )
        assert response.status_code == 401


class TestGetMyShows:
    """Tests for GET /api/me/shows"""

    def test_get_my_shows_returns_list(self, test_client):
        """Getting my shows should return a list."""
        response = test_client.get("/api/me/shows")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_my_shows_no_auth_fails(self, test_client_no_auth):
        """Getting shows without auth should return 403."""
        response = test_client_no_auth.get("/api/me/shows")
        assert response.status_code == 401


class TestGetShow:
    """Tests for GET /api/shows/{show_id}"""

    def test_get_nonexistent_show_returns_404(self, test_client):
        """Getting a nonexistent show should return 404."""
        fake_id = uuid4()
        response = test_client.get(f"/api/shows/{fake_id}")
        assert response.status_code == 404

    def test_get_show_invalid_uuid_returns_422(self, test_client):
        """Getting a show with invalid UUID should return 422."""
        response = test_client.get("/api/shows/not-a-uuid")
        assert response.status_code == 422


class TestUpdateShow:
    """Tests for PATCH /api/shows/{show_id}"""

    def test_update_nonexistent_show_returns_404(self, test_client):
        """Updating a nonexistent show should return 404."""
        fake_id = uuid4()
        response = test_client.patch(
            f"/api/shows/{fake_id}",
            json={"show_name": "Updated Name"}
        )
        assert response.status_code == 404


class TestDeleteShow:
    """Tests for DELETE /api/shows/{show_id}"""

    def test_delete_nonexistent_show_returns_404(self, test_client):
        """Deleting a nonexistent show should return 404."""
        fake_id = uuid4()
        response = test_client.delete(f"/api/shows/{fake_id}")
        assert response.status_code == 404


class TestShowIntegration:
    """Integration tests for show CRUD operations."""

    def test_full_show_lifecycle(self, test_client):
        """Test creating, reading, updating, and deleting a show."""
        # Create
        create_response = test_client.post(
            "/api/shows/",
            json={"show_name": "Lifecycle Test Show"}
        )
        assert create_response.status_code == 200
        show_id = create_response.json()["show_id"]

        # Read
        get_response = test_client.get(f"/api/shows/{show_id}")
        assert get_response.status_code == 200
        assert get_response.json()["show_name"] == "Lifecycle Test Show"

        # Update
        update_response = test_client.patch(
            f"/api/shows/{show_id}",
            json={"show_name": "Updated Lifecycle Show"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["show_name"] == "Updated Lifecycle Show"

        # Delete
        delete_response = test_client.delete(f"/api/shows/{show_id}")
        assert delete_response.status_code == 204

        # Verify deleted
        verify_response = test_client.get(f"/api/shows/{show_id}")
        assert verify_response.status_code == 404
