from __future__ import annotations

from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

from app.core.categories import SEED_CATEGORIES

EXPENSES = "/api/v1/expenses"


async def _add(client: AsyncClient, name: str, amount: str, cat: int, when: datetime):
    return await client.post(
        EXPENSES,
        json={"name": name, "amount": amount, "category_id": cat, "spent_at": when.isoformat()},
    )


async def test_summary_reflects_current_month(auth_client: AsyncClient):
    now = datetime.now(timezone.utc)
    await auth_client.post(
        EXPENSES,
        json={"name": "Dinner", "amount": "2000", "category_id": 1, "spent_at": now.isoformat()},
    )
    await auth_client.post(
        EXPENSES,
        json={"name": "Bill", "amount": "5000", "category_id": 2, "spent_at": now.isoformat()},
    )
    resp = await auth_client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["month_total"] == "7000.00"
    assert data["expense_count"] == 2
    assert data["top_category"]["slug"] == "utility"
    assert len(data["by_category"]) == 2
    assert len(data["recent"]) == 2


async def test_monthly_series_has_requested_points(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/dashboard/monthly", params={"months": 6})
    assert resp.status_code == 200
    assert len(resp.json()["points"]) == 6


async def test_categories_endpoint(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/categories")
    assert resp.status_code == 200
    slugs = [c["slug"] for c in resp.json()]
    expected = [c["slug"] for c in sorted(SEED_CATEGORIES, key=lambda c: c["sort_order"])]
    assert slugs == expected


async def test_insights_month_over_month(auth_client: AsyncClient):
    now = datetime.now(timezone.utc)
    first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month = first - timedelta(days=5)  # a date in the previous month

    # Last month: 10,000 (food 6,000, travel 4,000)
    await _add(auth_client, "Old food", "6000", 1, last_month)
    await _add(auth_client, "Old travel", "4000", 5, last_month)
    # This month: 15,000 (food 12,000, travel 3,000) -> +50% overall, food is top mover
    await _add(auth_client, "Dinner", "9000", 1, now)
    await _add(auth_client, "Lunch", "3000", 1, now)
    await _add(auth_client, "Cab", "3000", 5, now)

    r = await auth_client.get("/api/v1/dashboard/insights")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["this_month_total"] == "15000.00"
    assert d["last_month_total"] == "10000.00"
    assert abs(d["delta_pct"] - 0.5) < 1e-6
    assert d["top_mover"]["category_id"] == 1
    assert d["top_mover"]["delta"] == "6000.00"
    assert d["biggest_expense"]["name"] == "Dinner"
    assert d["biggest_expense"]["amount"] == "9000.00"


async def test_insights_empty(auth_client: AsyncClient):
    r = await auth_client.get("/api/v1/dashboard/insights")
    assert r.status_code == 200
    d = r.json()
    assert d["this_month_total"] == "0.00"
    assert d["last_month_total"] == "0.00"
    assert d["delta_pct"] is None
    assert d["top_mover"] is None
    assert d["biggest_expense"] is None


async def test_update_profile_theme(auth_client: AsyncClient):
    resp = await auth_client.patch("/api/v1/me", json={"theme": "dark", "display_name": "Asim"})
    assert resp.status_code == 200
    assert resp.json()["theme"] == "dark"
    assert resp.json()["display_name"] == "Asim"
