"""Password (PIN) hashing and JWT helpers.

Uses bcrypt directly (no passlib) to avoid version-compat issues. PINs are
6-digit strings; they are still hashed with bcrypt + per-user salt and the
login flow is rate-limited + lockout-protected to compensate for low entropy.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


# ----- PIN hashing -----------------------------------------------------------
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except ValueError:
        return False


# ----- One-time codes (forgot-PIN email OTP) --------------------------------
def generate_otp() -> str:
    """A random 6-digit numeric code. Stored hashed; short-lived + attempt-capped."""
    return f"{secrets.randbelow(1_000_000):06d}"


# ----- Access tokens (JWT) ---------------------------------------------------
def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.access_token_expire_days)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


# ----- Refresh tokens --------------------------------------------------------
def generate_refresh_token() -> str:
    """Opaque, high-entropy token handed to the client (stored hashed server-side)."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)


# ----- Personal API tokens (Siri/Shortcuts voice flow) ----------------------
API_TOKEN_PREFIX = "sj_live_"


def generate_api_token() -> str:
    """A long-lived, high-entropy personal access token. Stored hashed; the
    plaintext is shown to the user once. The ``sj_live_`` prefix lets the auth
    layer tell it apart from a JWT at a glance."""
    return f"{API_TOKEN_PREFIX}{secrets.token_urlsafe(32)}"


def hash_api_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
