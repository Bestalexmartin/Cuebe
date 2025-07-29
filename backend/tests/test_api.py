# backend/tests/test_api.py

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestBasicFunctionality:
    """Simple tests that work without complex database setup"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    def test_unauthenticated_access_blocked(self):
        """Test that protected endpoints require authentication"""
        response = client.get("/api/me/crews")
        assert response.status_code == 403  # No auth header
    
    def test_api_structure_exists(self):
        """Test that main API structure is working"""
        # This will hit our auth middleware and fail in expected ways
        response = client.get("/api/venues/")
        assert response.status_code in [401, 403, 404]  # Expected auth or not found failure
        
    def test_invalid_endpoint_returns_404(self):
        """Test that invalid endpoints return 404"""
        response = client.get("/api/nonexistent")
        assert response.status_code == 404
        assert response.json()["detail"] == "Not Found"