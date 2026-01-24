"""Basic health check tests for the API."""
import pytest


class TestHealthEndpoint:
    """Tests for the /api/health endpoint."""

    def test_health_returns_200(self, test_client):
        """Health endpoint should return 200 OK."""
        response = test_client.get("/api/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self, test_client):
        """Health endpoint should return status: ok."""
        response = test_client.get("/api/health")
        data = response.json()
        assert data == {"status": "ok"}
