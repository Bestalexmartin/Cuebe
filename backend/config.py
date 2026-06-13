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

    clerk_pem_public_key: Optional[str] = None
    clerk_webhook_secret: Optional[str] = None

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 1
    redis_url: str = "redis://redis:6379/0"

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
