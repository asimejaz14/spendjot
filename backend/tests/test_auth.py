from __future__ import annotations

import pytest
from httpx import AsyncClient

SIGNUP = "/api/v1/auth/signup"
LOGIN = "/api/v1/auth/login"


async def test_signup_returns_token_and_sets_cookie(client: AsyncClient):
    resp = await client.post(
        SIGNUP, json={"email": "New@Example.com", "pin": "123456"}
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["access_token"]
    assert "spendjot_refresh" in resp.cookies


async def test_signup_rejects_short_pin(client: AsyncClient):
    resp = await client.post(SIGNUP, json={"email": "a@b.com", "pin": "123"})
    assert resp.status_code == 422
    assert "error" in resp.json()


async def test_signup_duplicate_email_friendly_error(client: AsyncClient):
    await client.post(SIGNUP, json={"email": "dup@example.com", "pin": "123456"})
    resp = await client.post(SIGNUP, json={"email": "dup@example.com", "pin": "654321"})
    assert resp.status_code == 409
    assert resp.json()["error"]["message"] == "That email is already registered. Try logging in instead."


async def test_login_with_email_and_phone(client: AsyncClient):
    await client.post(
        SIGNUP, json={"email": "log@example.com", "phone": "+923009998877", "pin": "111111"}
    )
    by_email = await client.post(LOGIN, json={"identifier": "log@example.com", "pin": "111111"})
    assert by_email.status_code == 200
    by_phone = await client.post(LOGIN, json={"identifier": "+923009998877", "pin": "111111"})
    assert by_phone.status_code == 200


async def test_login_wrong_pin_is_generic(client: AsyncClient):
    await client.post(SIGNUP, json={"email": "wp@example.com", "pin": "222222"})
    resp = await client.post(LOGIN, json={"identifier": "wp@example.com", "pin": "999999"})
    assert resp.status_code == 401
    assert resp.json()["error"]["message"] == "Email/phone or PIN is incorrect."


async def test_account_locks_after_too_many_attempts(client: AsyncClient):
    await client.post(SIGNUP, json={"email": "lock@example.com", "pin": "333333"})
    last = None
    for _ in range(5):
        last = await client.post(LOGIN, json={"identifier": "lock@example.com", "pin": "000000"})
    assert last is not None and last.status_code == 429
    assert last.json()["error"]["code"] == "account_locked"
    # Correct PIN now also blocked while locked.
    blocked = await client.post(LOGIN, json={"identifier": "lock@example.com", "pin": "333333"})
    assert blocked.status_code == 429


async def test_refresh_rotates_token(client: AsyncClient):
    await client.post(SIGNUP, json={"email": "ref@example.com", "pin": "444444"})
    first = client.cookies.get("spendjot_refresh")
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_change_pin_flow(auth_client: AsyncClient):
    bad = await auth_client.post(
        "/api/v1/auth/change-pin", json={"current_pin": "000000", "new_pin": "654321"}
    )
    assert bad.status_code == 400
    ok = await auth_client.post(
        "/api/v1/auth/change-pin", json={"current_pin": "123456", "new_pin": "654321"}
    )
    assert ok.status_code == 204


async def test_protected_route_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "not_authenticated"
