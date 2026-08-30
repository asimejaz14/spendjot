from __future__ import annotations

import pytest
from httpx import AsyncClient

SIGNUP = "/api/v1/auth/signup"
TOKENS = "/api/v1/tokens"
VOICE = "/api/v1/voice/expense"
EXPENSES = "/api/v1/expenses"


async def _auth(client: AsyncClient, email: str) -> dict:
    resp = await client.post(SIGNUP, json={"email": email, "pin": "123456"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def test_token_create_list_revoke(client: AsyncClient):
    h = await _auth(client, "tok@example.com")

    created = await client.post(TOKENS, json={"name": "Siri"}, headers=h)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["token"].startswith("sj_live_")
    assert body["prefix"].startswith("sj_live_")
    assert "token" not in {k for k in body if k == "secret"}  # only 'token' carries it

    listed = await client.get(TOKENS, headers=h)
    assert listed.status_code == 200
    rows = listed.json()
    assert len(rows) == 1
    assert "token" not in rows[0]  # secret never returned on listing

    revoke = await client.delete(f"{TOKENS}/{body['id']}", headers=h)
    assert revoke.status_code == 204
    assert (await client.get(TOKENS, headers=h)).json() == []


async def test_voice_saves_expense_via_rules(client: AsyncClient):
    h = await _auth(client, "voice@example.com")

    resp = await client.post(VOICE, json={"text": "shisha 500 yesterday"}, headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["saved"] is True
    assert "rupees" in body["spoken"].lower()
    assert body["expense"]["amount"] == "500.00"
    assert body["expense"]["category"]["slug"] == "shisha"

    # It really persisted.
    listed = await client.get(EXPENSES, headers=h)
    assert listed.json()["total"] == 1


async def test_voice_without_amount_is_not_saved(client: AsyncClient):
    h = await _auth(client, "noamt@example.com")

    resp = await client.post(VOICE, json={"text": "coffee with friends"}, headers=h)
    assert resp.status_code == 200
    body = resp.json()
    assert body["saved"] is False
    assert "amount" in body["spoken"].lower()

    assert (await client.get(EXPENSES, headers=h)).json()["total"] == 0


async def test_voice_works_with_api_token(client: AsyncClient):
    h = await _auth(client, "apitok@example.com")
    token = (await client.post(TOKENS, json={"name": "Siri"}, headers=h)).json()["token"]
    token_h = {"Authorization": f"Bearer {token}"}

    resp = await client.post(VOICE, json={"text": "groceries 1.2k"}, headers=token_h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["saved"] is True
    assert body["expense"]["amount"] == "1200.00"


async def test_api_token_rejected_on_other_endpoints(client: AsyncClient):
    """A voice token must NOT unlock the rest of the account."""
    h = await _auth(client, "scope@example.com")
    token = (await client.post(TOKENS, json={"name": "Siri"}, headers=h)).json()["token"]
    token_h = {"Authorization": f"Bearer {token}"}

    # JWT-only endpoint should reject the API token.
    resp = await client.get(EXPENSES, headers=token_h)
    assert resp.status_code == 401


async def test_extract_preview_does_not_save(client: AsyncClient):
    h = await _auth(client, "preview@example.com")

    resp = await client.post(
        "/api/v1/voice/extract-preview", json={"text": "shisha 500 yesterday"}, headers=h
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["amount"] == "500.00"
    assert body["category_name"] == "Shisha"
    assert body["source"] in {"azure", "rules"}

    # Nothing was persisted.
    assert (await client.get(EXPENSES, headers=h)).json()["total"] == 0


async def test_voice_rate_limited_per_user(client: AsyncClient, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    monkeypatch.setattr(settings, "voice_rate_per_minute", 3)

    h = await _auth(client, "ratelimit@example.com")
    for _ in range(3):
        ok = await client.post(VOICE, json={"text": "food 100"}, headers=h)
        assert ok.status_code == 200, ok.text
    blocked = await client.post(VOICE, json={"text": "food 100"}, headers=h)
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "rate_limited"


async def test_voice_falls_back_to_rules_when_azure_errors(client: AsyncClient, monkeypatch):
    """With Azure 'configured' but the call failing, the endpoint must still save
    via the rule-based parser rather than erroring."""
    from app.core.config import settings
    from app.services import voice_service

    monkeypatch.setattr(settings, "azure_openai_endpoint", "https://bogus.invalid/openai/v1/responses")
    monkeypatch.setattr(settings, "azure_openai_api_key", "bad-key")

    async def boom(*args, **kwargs):
        raise RuntimeError("azure unreachable")

    monkeypatch.setattr(voice_service, "_extract_via_azure", boom)

    h = await _auth(client, "fallback@example.com")
    resp = await client.post(VOICE, json={"text": "shisha 500"}, headers=h)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["saved"] is True
    assert body["source"] == "rules"


async def test_revoked_token_cannot_post_voice(client: AsyncClient):
    h = await _auth(client, "revoked@example.com")
    created = (await client.post(TOKENS, json={"name": "Siri"}, headers=h)).json()
    token_h = {"Authorization": f"Bearer {created['token']}"}

    await client.delete(f"{TOKENS}/{created['id']}", headers=h)

    resp = await client.post(VOICE, json={"text": "food 300"}, headers=token_h)
    assert resp.status_code == 401
