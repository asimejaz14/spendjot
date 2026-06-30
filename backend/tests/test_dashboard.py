from __future__ import annotations

from datetime import datetime, timezone

from httpx import AsyncClient

EXPENSES = "/api/v1/expenses"


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
    assert slugs == ["food", "utility", "shisha", "entertainment", "travel", "misc"]


async def test_update_profile_theme(auth_client: AsyncClient):
    resp = await auth_client.patch("/api/v1/me", json={"theme": "dark", "display_name": "Asim"})
    assert resp.status_code == 200
    assert resp.json()["theme"] == "dark"
    assert resp.json()["display_name"] == "Asim"
