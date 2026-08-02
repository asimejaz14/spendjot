"""Forgot-PIN flow: issue an email OTP, verify it, and reset the PIN.

Security posture:
- Codes are stored hashed (bcrypt), short-lived, and attempt-capped.
- Neither endpoint reveals whether an email is registered.
- A successful reset unlocks the account and revokes all refresh tokens, so any
  other logged-in sessions are signed out.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import generate_otp, hash_pin, verify_pin
from app.core.timeutils import as_utc
from app.models.pin_reset_otp import PinResetOtp
from app.models.refresh_token import RefreshToken
from app.models.user import User

_INVALID = AppError(
    "That code is invalid or has expired. Please request a new one.",
    code="invalid_otp",
    status_code=400,
)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def request_reset(db: AsyncSession, email: str) -> tuple[User | None, str | None]:
    """Create a fresh OTP for the email's user. Returns (user, plaintext_code) or
    (None, None) if no such user — the caller must not leak which it was."""
    user = await db.scalar(select(User).where(User.email == _normalize_email(email)))
    if user is None:
        return None, None

    # One active code at a time — drop any previous ones.
    await db.execute(delete(PinResetOtp).where(PinResetOtp.user_id == user.id))

    code = generate_otp()
    db.add(
        PinResetOtp(
            user_id=user.id,
            code_hash=hash_pin(code),
            expires_at=datetime.now(timezone.utc)
            + timedelta(minutes=settings.otp_expire_minutes),
        )
    )
    await db.flush()
    return user, code


async def reset_pin(db: AsyncSession, email: str, code: str, new_pin: str) -> User:
    user = await db.scalar(select(User).where(User.email == _normalize_email(email)))
    if user is None:
        raise _INVALID

    otp = await db.scalar(
        select(PinResetOtp)
        .where(PinResetOtp.user_id == user.id, PinResetOtp.consumed_at.is_(None))
        .order_by(PinResetOtp.created_at.desc())
    )
    if otp is None:
        raise _INVALID

    now = datetime.now(timezone.utc)
    if as_utc(otp.expires_at) < now:
        raise _INVALID
    if otp.attempts >= settings.otp_max_attempts:
        raise AppError(
            "Too many incorrect attempts. Please request a new code.",
            code="otp_locked",
            status_code=429,
        )

    if not verify_pin(code, otp.code_hash):
        otp.attempts += 1
        await db.commit()  # persist the attempt even though we raise
        raise _INVALID

    # Success: set the new PIN, unlock the account, sign out other sessions.
    otp.consumed_at = now
    user.pin_hash = hash_pin(new_pin)
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.flush()
    return user
