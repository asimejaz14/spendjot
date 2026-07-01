"""Application settings, loaded from environment variables / .env."""
from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    app_name: str = "Spend Jot API"
    api_prefix: str = "/api/v1"
    environment: str = "development"

    # Database — async SQLAlchemy URL
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/spendjot"

    # Auth / JWT
    jwt_secret_key: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 10
    refresh_token_expire_days: int = 30

    # Login throttling
    max_failed_logins: int = 5
    lockout_minutes: int = 5
    rate_limit_enabled: bool = True

    # CORS — comma-separated string in env, parsed to a list.
    # NoDecode stops pydantic-settings from JSON-parsing the env value so the
    # validator below can split it on commas.
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]

    # Cookie security (set True behind HTTPS)
    cookie_secure: bool = False

    # Encrypt the DB connection with TLS (sslmode=require — encrypt without CA
    # verification). Needed for Supabase's pooler over the public internet; the
    # local Postgres container has TLS off, so this defaults False.
    db_ssl: bool = False

    # Public URL of the frontend — used in transactional emails (logo + links).
    frontend_url: str = "http://localhost:3000"

    # Outgoing email. Two transports, tried in this order:
    #   1. Resend HTTP API (preferred) — works on hosts that block SMTP ports
    #      outbound, e.g. Render (25/465/587 are all blocked there).
    #   2. SMTP over implicit TLS (port 465) — fallback for environments where
    #      outbound SMTP is allowed.
    # Emails are only sent when at least one transport is configured (see
    # `emails_enabled`); otherwise sends are skipped (never blocks signup).
    resend_api_key: str = ""

    smtp_host: str = ""
    smtp_port: int = 465
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True  # implicit TLS (SMTPS) — correct for port 465

    # From identity, shared by both transports.
    smtp_from_email: str = "noreply@spendjot.com"
    smtp_from_name: str = "Spend Jot"

    @property
    def emails_enabled(self) -> bool:
        return bool(
            self.resend_api_key
            or (self.smtp_host and self.smtp_username and self.smtp_password)
        )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
