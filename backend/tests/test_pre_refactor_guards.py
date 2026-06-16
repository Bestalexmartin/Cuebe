from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException

from config import Settings
from models import AccessRole, Show, User, UserStatus
from routers.development import _require_dev_admin_access


def _build_import_payload(show_id: str) -> dict:
    return {
        "script_metadata": {
            "script_name": "Imported Script",
            "script_status": "IMPORTED",
        },
        "script_elements": [],
        "import_metadata": {
            "source_file": "test.csv",
            "import_timestamp": datetime.now(timezone.utc).isoformat(),
            "total_elements": 0,
            "warnings": [],
            "confidence_scores": {},
            "has_group_hierarchy": False,
        },
        "show_id": show_id,
    }


class TestScriptImportAuthorization:
    @pytest.fixture
    def other_users_show(self, db_session):
        other_user = User(
            user_id=uuid4(),
            email_address=f"owner_{uuid4().hex[:8]}@example.com",
            fullname_first="Other",
            fullname_last="Owner",
            user_status=UserStatus.VERIFIED,
            user_role="director",
        )
        db_session.add(other_user)
        db_session.flush()

        show = Show(
            show_id=uuid4(),
            show_name="Other User Show",
            owner_id=other_user.user_id,
        )
        db_session.add(show)
        db_session.commit()
        db_session.refresh(show)
        return show

    @pytest.mark.parametrize("path", ["/api/scripts/import/validate", "/api/scripts/import"])
    def test_import_endpoints_reject_non_owner_show_access(self, test_client, other_users_show, path):
        payload = _build_import_payload(str(other_users_show.show_id))

        response = test_client.post(path, json=payload)

        assert response.status_code == 403
        assert response.json()["detail"] == "Not authorized to access this show"


class TestRuntimeConfigValidation:
    def test_production_like_config_rejects_default_jwt_secret(self):
        settings = Settings(
            app_env="production",
            jwt_secret_key="dev-insecure-jwt-secret-change-me",
            totp_encryption_key="test-key",
        )

        with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
            settings.validate_runtime_config()

    def test_production_like_config_requires_totp_encryption_key(self):
        settings = Settings(
            app_env="production",
            jwt_secret_key="not-the-default",
            totp_encryption_key="",
        )

        with pytest.raises(ValueError, match="TOTP_ENCRYPTION_KEY"):
            settings.validate_runtime_config()

    def test_development_config_allows_defaults(self):
        settings = Settings()

        settings.validate_runtime_config()


class TestDevelopmentRouteAdminGuard:
    def test_non_admin_user_is_rejected(self):
        user = User(
            user_id=uuid4(),
            email_address=f"user_{uuid4().hex[:8]}@example.com",
            fullname_first="Regular",
            fullname_last="User",
            user_status=UserStatus.VERIFIED,
            access_role=AccessRole.USER,
            user_role="director",
        )

        with pytest.raises(HTTPException) as exc:
            _require_dev_admin_access(user)

        assert exc.value.status_code == 403
        assert exc.value.detail == "Admin access required"

    @pytest.mark.parametrize("role", [AccessRole.ADMIN, AccessRole.SUPER_ADMIN])
    def test_admin_roles_are_allowed(self, role):
        user = User(
            user_id=uuid4(),
            email_address=f"admin_{uuid4().hex[:8]}@example.com",
            fullname_first="Admin",
            fullname_last="User",
            user_status=UserStatus.VERIFIED,
            access_role=role,
            user_role="director",
        )

        _require_dev_admin_access(user)
