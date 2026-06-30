from __future__ import annotations

from httpx import AsyncClient

EXPENSES = "/api/v1/expenses"


async def _create(client: AsyncClient, **overrides):
    payload = {"name": "Lunch", "amount": "1200.00", "category_id": 1}
    payload.update(overrides)
    return await client.post(EXPENSES, json=payload)


async def test_create_and_list_expense(auth_client: AsyncClient):
    resp = await _create(auth_client, name="Coffee", amount="450")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Coffee"
    assert body["category"]["slug"] == "food"

    listed = await auth_client.get(EXPENSES)
    assert listed.status_code == 200
    data = listed.json()
    assert data["total"] == 1
    assert data["total_amount"] == "450.00"


async def test_create_rejects_bad_category(auth_client: AsyncClient):
    resp = await _create(auth_client, category_id=999)
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "invalid_category"


async def test_create_rejects_non_positive_amount(auth_client: AsyncClient):
    resp = await _create(auth_client, amount="0")
    assert resp.status_code == 422


async def test_update_and_delete(auth_client: AsyncClient):
    created = await _create(auth_client)
    eid = created.json()["id"]

    upd = await auth_client.patch(f"{EXPENSES}/{eid}", json={"amount": "2000", "category_id": 2})
    assert upd.status_code == 200
    assert upd.json()["amount"] == "2000.00"
    assert upd.json()["category"]["slug"] == "utility"

    deleted = await auth_client.delete(f"{EXPENSES}/{eid}")
    assert deleted.status_code == 204
    gone = await auth_client.patch(f"{EXPENSES}/{eid}", json={"amount": "1"})
    assert gone.status_code == 404


async def test_filter_by_category_and_search(auth_client: AsyncClient):
    await _create(auth_client, name="Groceries", amount="3000", category_id=1)
    await _create(auth_client, name="Electricity", amount="9000", category_id=2)

    by_cat = await auth_client.get(EXPENSES, params={"category_id": 2})
    assert by_cat.json()["total"] == 1
    assert by_cat.json()["items"][0]["name"] == "Electricity"

    by_search = await auth_client.get(EXPENSES, params={"search": "groc"})
    assert by_search.json()["total"] == 1


async def test_expenses_are_isolated_between_users(client: AsyncClient):
    # User A
    a = await client.post("/api/v1/auth/signup", json={"email": "a@x.com", "pin": "123456"})
    a_token = a.json()["access_token"]
    await client.post(
        EXPENSES,
        json={"name": "A-only", "amount": "100", "category_id": 1},
        headers={"Authorization": f"Bearer {a_token}"},
    )
    # User B
    b = await client.post("/api/v1/auth/signup", json={"email": "b@x.com", "pin": "123456"})
    b_token = b.json()["access_token"]
    b_list = await client.get(EXPENSES, headers={"Authorization": f"Bearer {b_token}"})
    assert b_list.json()["total"] == 0
