"""Authentication business logic: signup, login (with lockout), token rotation."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import (
    generate_refresh_token,
    hash_pin,
    hash_refresh_token,
    refresh_token_expiry,
    verify_pin,
)
from app.core.timeutils import as_utc
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _looks_like_email(identifier: str) -> bool:
    return "@" in identifier


async def signup(db: AsyncSession, data: SignupRequest) -> User:
    email = _normalize_email(data.email)

    existing = await db.scalar(select(User).where(User.email == email))
    if existing:
        raise AppError(
            "That email is already registered. Try logging in instead.",
            code="email_taken",
            status_code=409,
        )

    if data.phone:
        phone_taken = await db.scalar(select(User).where(User.phone == data.phone))
        if phone_taken:
            raise AppError(
                "That phone number is already registered.",
                code="phone_taken",
                status_code=409,
            )

    user = User(
        email=email,
        phone=data.phone,
        pin_hash=hash_pin(data.pin),
        display_name=(data.display_name or None),
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate(db: AsyncSession, data: LoginRequest) -> User:
    identifier = data.identifier.strip()
    if _looks_like_email(identifier):
        stmt = select(User).where(User.email == identifier.lower())
    else:
        normalized_phone = identifier.replace(" ", "")
        stmt = select(User).where(User.phone == normalized_phone)

    user = await db.scalar(stmt)

    # Avoid leaking which field was wrong.
    invalid = AppError(
        "Email/phone or PIN is incorrect.", code="invalid_credentials", status_code=401
    )
    if user is None:
        raise invalid

    now = datetime.now(timezone.utc)
    locked_until = as_utc(user.locked_until) if user.locked_until else None
    if locked_until and locked_until > now:
        minutes = max(1, int((locked_until - now).total_seconds() // 60) + 1)
        raise AppError(
            f"Too many attempts. Please try again in about {minutes} minute(s).",
            code="account_locked",
            status_code=429,
        )

    if not verify_pin(data.pin, user.pin_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.max_failed_logins:
            user.locked_until = now + _lockout_delta()
            user.failed_login_attempts = 0
            # Commit so the lockout survives the error response that follows.
            await db.commit()
            raise AppError(
                "Too many attempts. Your account is locked for a few minutes.",
                code="account_locked",
                status_code=429,
            )
        await db.commit()
        raise invalid

    # Success — reset counters.
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.flush()
    return user


def _lockout_delta():
    from datetime import timedelta

    return timedelta(minutes=settings.lockout_minutes)


async def issue_refresh_token(db: AsyncSession, user: User) -> str:
    raw = generate_refresh_token()
    record = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw),
        expires_at=refresh_token_expiry(),
    )
    db.add(record)
    await db.flush()
    return raw


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> tuple[User, str]:
    token_hash = hash_refresh_token(raw_token)
    record = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    expired_msg = AppError(
        "Your session has expired. Please sign in again.",
        code="invalid_refresh",
        status_code=401,
    )
    if record is None or record.revoked_at is not None:
        raise expired_msg

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise expired_msg

    user = await db.get(User, record.user_id)
    if user is None:
        raise expired_msg

    # Rotate: revoke the old token, issue a fresh one.
    record.revoked_at = datetime.now(timezone.utc)
    await db.flush()
    new_raw = await issue_refresh_token(db, user)
    return user, new_raw


async def revoke_refresh_token(db: AsyncSession, raw_token: str | None) -> None:
    if not raw_token:
        return
    token_hash = hash_refresh_token(raw_token)
    record = await db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        await db.flush()


async def change_pin(db: AsyncSession, user: User, current_pin: str, new_pin: str) -> None:
    if not verify_pin(current_pin, user.pin_hash):
        raise AppError(
            "Your current PIN is incorrect.", code="invalid_pin", status_code=400
        )
    user.pin_hash = hash_pin(new_pin)
    await db.flush()
