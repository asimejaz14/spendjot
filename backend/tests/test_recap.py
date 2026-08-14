from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.services.email_service import build_weekly_recap_email
from app.services.recap_service import WeeklyStats

INTERNAL = "/api/v1/internal/weekly-recap"
EXPENSES = "/api/v1/expenses"


async def test_recap_endpoint_disabled_without_secret(auth_client: AsyncClient):
    # cron_secret defaults to "" -> endpoint is inert (404).
    r = await auth_client.post(INTERNAL)
    assert r.status_code == 404


async def test_recap_endpoint_rejects_wrong_secret(
    auth_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "cron_secret", "right-secret")
    r = await auth_client.post(INTERNAL, headers={"X-Cron-Secret": "wrong"})
    assert r.status_code == 403


async def test_recap_runs_for_active_users(
    auth_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(settings, "cron_secret", "right-secret")
    now = datetime.now(timezone.utc)
    await auth_client.post(
        EXPENSES,
        json={"name": "Dinner", "amount": "2000", "category_id": 1, "spent_at": now.isoformat()},
    )
    r = await auth_client.post(INTERNAL, headers={"X-Cron-Secret": "right-secret"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["eligible"] >= 1
    # No email provider configured in tests -> sends are skipped, so sent == 0.
    assert body["sent"] == 0


def test_build_weekly_recap_email_renders_numbers():
    stats = WeeklyStats(
        week_total=Decimal("7300"),
        week_count=5,
        top_category="Grocery",
        top_category_amount=Decimal("6500"),
        month_label="August 2026",
        month_spent=Decimal("17100"),
        month_budget=Decimal("80000"),
        month_remaining=Decimal("62900"),
        month_pct=0.21,
        safe_per_day=Decimal("2096"),
        days_left=30,
    )
    subject, html, text = build_weekly_recap_email("Asim Ejaz", stats)
    assert "week" in subject.lower()
    assert "Rs 7,300" in html and "Rs 7,300" in text
    assert "Grocery" in html
    assert "Rs 80,000" in html  # budget context present
    assert "Asim" in html  # first-name greeting


def test_build_weekly_recap_email_without_budget():
    stats = WeeklyStats(
        week_total=Decimal("1200"),
        week_count=2,
        top_category="Travel",
        top_category_amount=Decimal("900"),
        month_label="August 2026",
        month_spent=Decimal("1200"),
        month_budget=None,
        month_remaining=None,
        month_pct=None,
        safe_per_day=None,
        days_left=30,
    )
    subject, html, text = build_weekly_recap_email(None, stats)
    assert "Here's your week" in html  # no name -> generic greeting
    assert "budget" not in html.lower()  # no budget block when none set
