"""Tests for the departments router endpoints."""
import pytest
from uuid import uuid4


class TestGetDepartments:
    """Tests for GET /api/me/departments"""

    def test_get_my_departments_returns_list(self, test_client):
        """Getting my departments should return a list."""
        response = test_client.get("/api/me/departments")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_my_departments_no_auth_fails(self, test_client_no_auth):
        """Getting departments without auth should return 403."""
        response = test_client_no_auth.get("/api/me/departments")
        assert response.status_code == 401


class TestGetDepartment:
    """Tests for GET /api/departments/{department_id}"""

    def test_get_nonexistent_department_returns_404(self, test_client):
        """Getting a nonexistent department should return 404."""
        fake_id = uuid4()
        response = test_client.get(f"/api/departments/{fake_id}")
        assert response.status_code == 404

    def test_get_department_invalid_uuid_returns_422(self, test_client):
        """Getting a department with invalid UUID should return 422."""
        response = test_client.get("/api/departments/not-a-uuid")
        assert response.status_code == 422


class TestCreateDepartment:
    """Tests for POST /api/me/departments"""

    def test_create_department_success(self, test_client):
        """Creating a department should return the new department."""
        response = test_client.post(
            "/api/me/departments",
            json={
                "department_name": "Lighting",
                "department_color": "#FFD700"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["department_name"] == "Lighting"
        assert "department_id" in data

    def test_create_department_minimal(self, test_client):
        """Creating a department requires name and color."""
        response = test_client.post(
            "/api/me/departments",
            json={"department_name": "Sound", "department_color": "#0000FF"}
        )
        assert response.status_code == 201


class TestDepartmentIntegration:
    """Integration tests for department operations."""

    def test_department_lifecycle(self, test_client):
        """Test creating, reading, updating, and deleting a department."""
        # Create
        create_response = test_client.post(
            "/api/me/departments",
            json={"department_name": "Props", "department_color": "#00FF00"}
        )
        assert create_response.status_code == 201
        dept_id = create_response.json()["department_id"]

        # Read
        get_response = test_client.get(f"/api/departments/{dept_id}")
        assert get_response.status_code == 200
        assert get_response.json()["department_name"] == "Props"

        # Update (requires both name and color due to schema design)
        update_response = test_client.patch(
            f"/api/departments/{dept_id}",
            json={"department_name": "Props & Set", "department_color": "#00FF00"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["department_name"] == "Props & Set"

        # Delete
        delete_response = test_client.delete(f"/api/departments/{dept_id}")
        assert delete_response.status_code == 204

        # Verify deleted
        verify_response = test_client.get(f"/api/departments/{dept_id}")
        assert verify_response.status_code == 404
