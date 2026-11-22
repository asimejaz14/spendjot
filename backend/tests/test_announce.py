from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services import announcement_service, email_service
from app.services.email_service import build_whats_new_email

URL = "/api/v1/internal/announce/whats-new"
SECRET = {"X-Cron-Secret": "right-secret"}


@pytest.fixture
def outbox(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    """Capture sends instead of hitting an email provider."""
    sent: list[dict] = []

    async def fake_send(*, to: str, subject: str, html: str, text: str) -> bool:
        sent.append({"to": to, "subject": subject, "html": html, "text": text})
        return True

    monkeypatch.setattr(settings, "cron_secret", "right-secret")
    monkeypatch.setattr(email_service, "send_email", fake_send)
    monkeypatch.setattr(announcement_service, "SEND_INTERVAL_SECONDS", 0)
    return sent


async def test_announce_requires_secret(auth_client: AsyncClient):
    assert (await auth_client.post(URL, json={"confirm_all": True})).status_code == 404


async def test_announce_needs_explicit_target(auth_client: AsyncClient, outbox):
    r = await auth_client.post(URL, json={}, headers=SECRET)
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "confirmation_required"
    assert outbox == []


async def test_announce_test_send_hits_only_one_address(auth_client: AsyncClient, outbox):
    r = await auth_client.post(URL, json={"test_to": "me@example.com"}, headers=SECRET)
    assert r.status_code == 200, r.text
    assert r.json() == {"mode": "test", "eligible": 1, "sent": 1, "failed": 0}
    assert [m["to"] for m in outbox] == ["me@example.com"]


async def test_announce_all_emails_every_user(auth_client: AsyncClient, client: AsyncClient, outbox):
    await client.post(
        "/api/v1/auth/signup",
        json={"email": "second@example.com", "pin": "246810", "display_name": "Sam Second"},
    )
    outbox.clear()  # ignore welcome emails from signup
    r = await auth_client.post(URL, json={"confirm_all": True}, headers=SECRET)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mode"] == "all" and body["eligible"] == body["sent"] >= 2
    assert "second@example.com" in {m["to"] for m in outbox}


def test_whats_new_email_content():
    subject, html, text = build_whats_new_email("Asim Ejaz")
    assert subject == "New in Spend Jot: add many expenses at once"
    assert "Hi Asim, here's what's new" in html
    assert "/dashboard" in html and "Catch up on your spending" in html
    assert "#153D30" in html  # new brand colour, no leftover violet
    assert "#7C3AED" not in html
    assert text.count("•") == 3
