# backend/config.py

from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    database_url: Optional[str] = None
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None
    postgres_db: Optional[str] = None

    allowed_origins: Optional[str] = None
    api_base_url: str = ""
    enable_dev_routes: str = ""

    resend_api_key: str = ""
    email_from_address: str = "noreply@cuebe.app"
    email_from_name: str = "Cuebe"
    email_logo_url: str = ""
    website_url: str = "http://localhost:5173"

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 1
    redis_url: str = "redis://redis:6379/0"

    # Blok 017 self-hosted auth
    app_env: str = "development"
    jwt_secret_key: str = "dev-insecure-jwt-secret-change-me"
    jwt_secret_keys: str = ""  # comma-separated list for zero-downtime key rotation
    jwt_access_token_expire_minutes: int = 480
    jwt_refresh_token_expire_days: int = 14
    auth_bcrypt_rounds: int = 12
    auth_lockout_threshold: int = 5
    auth_lockout_duration_minutes: int = 30
    auth_mfa_issuer_name: str = "Cuebe"
    totp_encryption_key: str = ""

    # Auth cookie tuning (split-domain deployments)
    cookie_domain: str = ""
    cookie_samesite: str = "lax"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return "postgresql://{user}:{password}@{host}:{port}/{db}".format(
            user=self.postgres_user,
            password=self.postgres_password,
            host="db",
            port="5432",
            db=self.postgres_db,
        )

    @property
    def dev_routes_enabled(self) -> bool:
        # Preserves the original `ENABLE_DEV_ROUTES in {"1","true","True"}` semantics
        return self.enable_dev_routes in {"1", "true", "True"}


settings = Settings()
