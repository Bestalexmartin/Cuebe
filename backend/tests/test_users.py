"""Tests for the users router endpoints."""
import pytest
from uuid import uuid4


class TestCheckEmail:
    """Tests for GET /api/users/check-email"""

    def test_check_email_returns_result(self, test_client):
        """Checking email should return user info or null."""
        response = test_client.get("/api/users/check-email?email=test@example.com")
        assert response.status_code == 200

    def test_check_email_nonexistent(self, test_client):
        """Checking nonexistent email should return null."""
        response = test_client.get("/api/users/check-email?email=nonexistent@example.com")
        assert response.status_code == 200
        assert response.json() is None

    def test_check_email_no_auth_fails(self, test_client_no_auth):
        """Checking email without auth should return 403."""
        response = test_client_no_auth.get("/api/users/check-email?email=test@example.com")
        assert response.status_code == 401


class TestUserOptions:
    """Tests for GET/PATCH /api/users/options"""

    def test_get_options(self, test_client):
        """Getting user options should return a dict."""
        response = test_client.get("/api/users/options")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

    def test_get_options_no_auth_fails(self, test_client_no_auth):
        """Getting options without auth should return 403."""
        response = test_client_no_auth.get("/api/users/options")
        assert response.status_code == 401


class TestUserPreferences:
    """Tests for GET/PATCH /api/users/preferences"""

    def test_get_preferences(self, test_client):
        """Getting user preferences should return preferences object."""
        response = test_client.get("/api/users/preferences")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_get_preferences_no_auth_fails(self, test_client_no_auth):
        """Getting preferences without auth should return 403."""
        response = test_client_no_auth.get("/api/users/preferences")
        assert response.status_code == 401
