"""Tests for script-related endpoints in shows router."""
import pytest
from uuid import uuid4


class TestCreateScript:
    """Tests for POST /api/shows/{show_id}/scripts/"""

    def test_create_script_for_nonexistent_show_returns_404(self, test_client):
        """Creating a script for nonexistent show should return 404."""
        fake_id = uuid4()
        response = test_client.post(
            f"/api/shows/{fake_id}/scripts/",
            json={"script_name": "New Script"}
        )
        assert response.status_code == 404


class TestGetScript:
    """Tests for GET /api/scripts/{script_id}"""

    def test_get_nonexistent_script_returns_404(self, test_client):
        """Getting a nonexistent script should return 404."""
        fake_id = uuid4()
        response = test_client.get(f"/api/scripts/{fake_id}")
        assert response.status_code == 404

    def test_get_script_invalid_uuid_returns_422(self, test_client):
        """Getting a script with invalid UUID should return 422."""
        response = test_client.get("/api/scripts/not-a-uuid")
        assert response.status_code == 422


class TestUpdateScript:
    """Tests for PATCH /api/scripts/{script_id}"""

    def test_update_nonexistent_script_returns_404(self, test_client):
        """Updating a nonexistent script should return 404."""
        fake_id = uuid4()
        response = test_client.patch(
            f"/api/scripts/{fake_id}",
            json={"script_name": "Updated Script"}
        )
        assert response.status_code == 404


class TestDeleteScript:
    """Tests for DELETE /api/scripts/{script_id}"""

    def test_delete_nonexistent_script_returns_404(self, test_client):
        """Deleting a nonexistent script should return 404."""
        fake_id = uuid4()
        response = test_client.delete(f"/api/scripts/{fake_id}")
        assert response.status_code == 404


class TestDuplicateScript:
    """Tests for POST /api/scripts/{script_id}/duplicate"""

    def test_duplicate_nonexistent_script_returns_404(self, test_client):
        """Duplicating a nonexistent script should return 404."""
        fake_id = uuid4()
        response = test_client.post(
            f"/api/scripts/{fake_id}/duplicate",
            json={"script_name": "Copy"}
        )
        assert response.status_code == 404


class TestScriptIntegration:
    """Integration tests for script CRUD operations."""

    def test_full_script_lifecycle(self, test_client):
        """Test creating, reading, updating, and deleting a script."""
        # First create a show
        show_response = test_client.post(
            "/api/shows/",
            json={"show_name": "Script Test Show"}
        )
        assert show_response.status_code == 200
        show_data = show_response.json()
        show_id = show_data["show_id"]

        # Get the default script that was created with the show
        assert len(show_data["scripts"]) == 1
        default_script_id = show_data["scripts"][0]["script_id"]

        # Create another script
        create_response = test_client.post(
            f"/api/shows/{show_id}/scripts/",
            json={"script_name": "Second Script"}
        )
        assert create_response.status_code == 200
        new_script_id = create_response.json()["script_id"]

        # Read the new script
        get_response = test_client.get(f"/api/scripts/{new_script_id}")
        assert get_response.status_code == 200
        assert get_response.json()["script_name"] == "Second Script"

        # Update the script
        update_response = test_client.patch(
            f"/api/scripts/{new_script_id}",
            json={"script_name": "Updated Second Script"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["script_name"] == "Updated Second Script"

        # Duplicate the script
        dup_response = test_client.post(
            f"/api/scripts/{new_script_id}/duplicate",
            json={"script_name": "Duplicated Script"}
        )
        assert dup_response.status_code == 200
        dup_script_id = dup_response.json()["script_id"]
        assert dup_script_id != new_script_id

        # Delete the duplicated script
        delete_response = test_client.delete(f"/api/scripts/{dup_script_id}")
        assert delete_response.status_code == 204

        # Verify it's deleted
        verify_response = test_client.get(f"/api/scripts/{dup_script_id}")
        assert verify_response.status_code == 404

        # Cleanup - delete the show (cascades to scripts)
        test_client.delete(f"/api/shows/{show_id}")

    def test_deleting_show_cascades_to_scripts(self, test_client):
        """Deleting a show should delete all its scripts."""
        # Create show (gets default script)
        show_response = test_client.post(
            "/api/shows/",
            json={"show_name": "Cascade Test Show"}
        )
        show_id = show_response.json()["show_id"]
        script_id = show_response.json()["scripts"][0]["script_id"]

        # Verify script exists
        assert test_client.get(f"/api/scripts/{script_id}").status_code == 200

        # Delete show
        test_client.delete(f"/api/shows/{show_id}")

        # Verify script is gone
        assert test_client.get(f"/api/scripts/{script_id}").status_code == 404
