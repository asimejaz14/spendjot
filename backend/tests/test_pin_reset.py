from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.exceptions import AppError
from app.core.security import verify_pin
from app.models.pin_reset_otp import PinResetOtp
from app.schemas.auth import SignupRequest
from app.services import auth_service, pin_reset_service

FORGOT = "/api/v1/auth/forgot-pin"
RESET = "/api/v1/auth/reset-pin"
EMAIL = "user@example.com"


async def _make_user(session, email=EMAIL, pin="123456"):
    user = await auth_service.signup(session, SignupRequest(email=email, pin=pin))
    await session.commit()
    return user


def _wrong(code: str) -> str:
    return "111111" if code != "111111" else "222222"


# ---- service layer ----------------------------------------------------------
async def test_reset_happy_path(sessionmaker_):
    async with sessionmaker_() as s:
        await _make_user(s)
        _, code = await pin_reset_service.request_reset(s, EMAIL)
        await s.commit()
    assert code.isdigit() and len(code) == 6

    async with sessionmaker_() as s:
        user = await pin_reset_service.reset_pin(s, EMAIL, code, "654321")
        await s.commit()
        assert verify_pin("654321", user.pin_hash)
        assert not verify_pin("123456", user.pin_hash)


async def test_request_unknown_email_is_noop(sessionmaker_):
    async with sessionmaker_() as s:
        user, code = await pin_reset_service.request_reset(s, "nobody@example.com")
        assert user is None and code is None


async def test_wrong_code_increments_then_locks(sessionmaker_):
    async with sessionmaker_() as s:
        await _make_user(s)
        _, code = await pin_reset_service.request_reset(s, EMAIL)
        await s.commit()

    for _ in range(settings.otp_max_attempts):
        async with sessionmaker_() as s:
            with pytest.raises(AppError) as ei:
                await pin_reset_service.reset_pin(s, EMAIL, _wrong(code), "654321")
            assert ei.value.code == "invalid_otp"

    # Attempts exhausted -> even the correct code is refused now.
    async with sessionmaker_() as s:
        with pytest.raises(AppError) as ei:
            await pin_reset_service.reset_pin(s, EMAIL, code, "654321")
        assert ei.value.code == "otp_locked"


async def test_expired_code_rejected(sessionmaker_):
    async with sessionmaker_() as s:
        await _make_user(s)
        _, code = await pin_reset_service.request_reset(s, EMAIL)
        otp = await s.scalar(select(PinResetOtp))
        otp.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await s.commit()

    async with sessionmaker_() as s:
        with pytest.raises(AppError) as ei:
            await pin_reset_service.reset_pin(s, EMAIL, code, "654321")
        assert ei.value.code == "invalid_otp"


# ---- HTTP endpoints ---------------------------------------------------------
async def test_forgot_pin_does_not_leak_existence(auth_client: AsyncClient):
    r_known = await auth_client.post(FORGOT, json={"email": "asim@example.com"})
    r_unknown = await auth_client.post(FORGOT, json={"email": "ghost@example.com"})
    assert r_known.status_code == 200
    assert r_unknown.status_code == 200
    assert r_known.json() == r_unknown.json()  # identical response — no enumeration


async def test_reset_pin_endpoint_happy_path(client: AsyncClient, sessionmaker_):
    await client.post(
        "/api/v1/auth/signup", json={"email": "reset@example.com", "pin": "123456"}
    )
    async with sessionmaker_() as s:
        _, code = await pin_reset_service.request_reset(s, "reset@example.com")
        await s.commit()

    r = await client.post(
        RESET, json={"email": "reset@example.com", "code": code, "new_pin": "654321"}
    )
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()

    ok = await client.post(
        "/api/v1/auth/login", json={"identifier": "reset@example.com", "pin": "654321"}
    )
    assert ok.status_code == 200
    bad = await client.post(
        "/api/v1/auth/login", json={"identifier": "reset@example.com", "pin": "123456"}
    )
    assert bad.status_code == 401
