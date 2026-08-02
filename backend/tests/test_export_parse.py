from __future__ import annotations

from datetime import datetime, timedelta, timezone

from httpx import AsyncClient

PARSE = "/api/v1/expenses/parse"
EXPORT = "/api/v1/expenses/export"
EXPENSES = "/api/v1/expenses"


async def test_parse_shisha_yesterday(auth_client: AsyncClient):
    r = await auth_client.post(PARSE, json={"text": "shisha 500 yesterday"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["category_id"] == 3  # shisha
    assert d["amount"] == "500.00"
    assert d["name"] == "Shisha"
    expected = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    assert d["spent_at"].startswith(expected)


async def test_parse_amount_variants_and_categories(auth_client: AsyncClient):
    cases = [
        ("uber 1,250 today", 5, "1250.00", "Uber"),
        ("1.5k groceries", 7, "1500.00", "Groceries"),
        ("coffee 200", 1, "200.00", "Coffee"),
    ]
    for text, cat, amount, name in cases:
        d = (await auth_client.post(PARSE, json={"text": text})).json()
        assert d["category_id"] == cat, text
        assert d["amount"] == amount, text
        assert d["name"] == name, text


async def test_parse_fallback_misc_no_amount(auth_client: AsyncClient):
    d = (await auth_client.post(PARSE, json={"text": "random note"})).json()
    assert d["category_id"] == 6  # misc
    assert d["amount"] is None
    assert d["name"] == "Random note"


async def test_export_xlsx(auth_client: AsyncClient):
    now = datetime.now(timezone.utc)
    await auth_client.post(
        EXPENSES,
        json={"name": "Dinner", "amount": "2000", "category_id": 1, "spent_at": now.isoformat()},
    )
    r = await auth_client.get(EXPORT, params={"format": "xlsx"})
    assert r.status_code == 200
    assert "spreadsheetml" in r.headers["content-type"]
    assert "attachment" in r.headers["content-disposition"]
    assert r.content[:2] == b"PK"  # xlsx is a zip archive


async def test_export_pdf(auth_client: AsyncClient):
    now = datetime.now(timezone.utc)
    await auth_client.post(
        EXPENSES,
        json={"name": "Dinner", "amount": "2000", "category_id": 1, "spent_at": now.isoformat()},
    )
    r = await auth_client.get(EXPORT, params={"format": "pdf"})
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


async def test_export_rejects_bad_format(auth_client: AsyncClient):
    r = await auth_client.get(EXPORT, params={"format": "csv"})
    assert r.status_code == 422
