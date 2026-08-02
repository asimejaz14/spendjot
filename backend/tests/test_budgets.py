from __future__ import annotations

from datetime import datetime, timezone

from httpx import AsyncClient

BUDGETS = "/api/v1/budgets"
EXPENSES = "/api/v1/expenses"


async def test_set_upsert_and_list_budgets(auth_client: AsyncClient):
    # Overall budget (category_id omitted -> NULL).
    r = await auth_client.put(BUDGETS, json={"amount": "50000"})
    assert r.status_code == 200, r.text
    assert r.json()["category_id"] is None

    # Per-category budget.
    r = await auth_client.put(BUDGETS, json={"category_id": 1, "amount": "15000"})
    assert r.status_code == 200

    # Re-setting the overall updates in place (no duplicate row).
    r = await auth_client.put(BUDGETS, json={"amount": "60000"})
    assert r.status_code == 200

    items = (await auth_client.get(BUDGETS)).json()
    assert len(items) == 2
    overall = next(b for b in items if b["category_id"] is None)
    assert overall["amount"] == "60000.00"


async def test_set_budget_rejects_unknown_category(auth_client: AsyncClient):
    r = await auth_client.put(BUDGETS, json={"category_id": 9999, "amount": "1000"})
    assert r.status_code == 404


async def test_progress_math(auth_client: AsyncClient):
    now = datetime.now(timezone.utc)
    await auth_client.put(BUDGETS, json={"amount": "30000"})
    await auth_client.put(BUDGETS, json={"category_id": 1, "amount": "10000"})

    await auth_client.post(
        EXPENSES,
        json={"name": "Dinner", "amount": "2000", "category_id": 1, "spent_at": now.isoformat()},
    )
    await auth_client.post(
        EXPENSES,
        json={"name": "Cab", "amount": "1000", "category_id": 5, "spent_at": now.isoformat()},
    )

    p = (await auth_client.get(f"{BUDGETS}/progress")).json()
    assert p["overall"]["budget"] == "30000.00"
    assert p["overall"]["spent"] == "3000.00"
    assert p["overall"]["remaining"] == "27000.00"
    assert 28 <= p["days_in_month"] <= 31

    # Only budgeted categories appear; food (id 1) has 2000 spent of 10000.
    assert [c["category_id"] for c in p["categories"]] == [1]
    food = p["categories"][0]
    assert food["spent"] == "2000.00"
    assert food["remaining"] == "8000.00"


async def test_delete_budget(auth_client: AsyncClient):
    await auth_client.put(BUDGETS, json={"category_id": 1, "amount": "5000"})
    r = await auth_client.delete(BUDGETS, params={"category_id": 1})
    assert r.status_code == 204
    items = (await auth_client.get(BUDGETS)).json()
    assert all(b["category_id"] != 1 for b in items)
