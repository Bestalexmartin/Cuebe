# backend/tests/test_auth.py

import pytest
from unittest.mock import patch, MagicMock
from jose import jwt
import time
from fastapi import HTTPException

from main import get_current_user_claims, get_current_user
from models import User


class TestAuthentication:
    """Test authentication and authorization functionality"""
    
    def test_health_endpoint_no_auth(self, client):
        """Test that health endpoint works without authentication"""
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_valid_token_authentication(self, mock_jwt_decode, client):
        """Test successful token authentication"""
        mock_jwt_decode.return_value = {
            "sub": "user_123",
            "exp": int(time.time()) + 3600,  # 1 hour from now
            "nbf": int(time.time()) - 60,    # 1 minute ago
            "iat": int(time.time()),
            "email": "test@example.com"
        }
        
        headers = {"Authorization": "Bearer valid_token"}
        
        # Token is valid but user doesn't exist in test DB, should return 404
        response = client.get("/api/me/crews", headers=headers)
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_expired_token_rejection(self, mock_jwt_decode, client):
        """Test that expired tokens are rejected"""
        mock_jwt_decode.return_value = {
            "sub": "user_123",
            "exp": int(time.time()) - 3600,  # 1 hour ago (expired)
            "nbf": int(time.time()) - 7200,  # 2 hours ago
            "iat": int(time.time()) - 7200
        }
        
        headers = {"Authorization": "Bearer expired_token"}
        response = client.get("/api/me/crews", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid authentication credentials"
    
    @patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'})
    @patch('main.jwt.decode')
    def test_future_token_rejection(self, mock_jwt_decode, client):
        """Test that tokens with future nbf are rejected"""
        mock_jwt_decode.return_value = {
            "sub": "user_123", 
            "exp": int(time.time()) + 7200,  # 2 hours from now
            "nbf": int(time.time()) + 3600,  # 1 hour from now (not yet valid)
            "iat": int(time.time())
        }
        
        headers = {"Authorization": "Bearer future_token"}
        response = client.get("/api/me/crews", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid authentication credentials"
    
    def test_missing_token_rejection(self, client):
        """Test that requests without tokens are rejected"""
        response = client.get("/api/me/crews")
        assert response.status_code == 403  # FastAPI HTTPBearer returns 403 for missing auth
    
    def test_malformed_token_rejection(self, client):
        """Test that malformed tokens are rejected"""
        headers = {"Authorization": "Bearer malformed_token"}
        response = client.get("/api/me/crews", headers=headers)
        assert response.status_code == 401
    
    def test_missing_pem_key_error(self, client):
        """Test that missing PEM key configuration raises error"""
        with patch.dict('os.environ', {}, clear=True):
            headers = {"Authorization": "Bearer any_token"}
            response = client.get("/api/me/crews", headers=headers)
            assert response.status_code == 500
            assert "Missing PEM Public Key" in response.json()["detail"]


class TestUserAuthorization:
    """Test user authorization and data access patterns"""
    
    def test_user_not_found_in_database(self, client, db_session):
        """Test behavior when token is valid but user doesn't exist in database"""
        with patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'}):
            with patch('main.jwt.decode') as mock_jwt_decode:
                mock_jwt_decode.return_value = {
                    "sub": "nonexistent_user_id",
                    "exp": int(time.time()) + 3600,
                    "nbf": int(time.time()) - 60,
                    "iat": int(time.time())
                }
                
                headers = {"Authorization": "Bearer valid_token_no_user"}
                response = client.get("/api/me/crews", headers=headers)
                assert response.status_code == 404
                assert "User not found" in response.json()["detail"]


@pytest.fixture
def mock_valid_auth():
    """Fixture to mock valid authentication for other tests"""
    with patch.dict('os.environ', {'CLERK_PEM_PUBLIC_KEY': 'fake_pem_key'}):
        with patch('main.jwt.decode') as mock_jwt_decode:
            mock_jwt_decode.return_value = {
                "sub": "test_user_123",
                "exp": int(time.time()) + 3600,
                "nbf": int(time.time()) - 60,
                "iat": int(time.time()),
                "email": "test@example.com"
            }
            yield mock_jwt_decode