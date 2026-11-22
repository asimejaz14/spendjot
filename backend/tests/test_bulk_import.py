from __future__ import annotations

import io
from datetime import datetime

from httpx import AsyncClient
from openpyxl import Workbook, load_workbook

EXPENSES = "/api/v1/expenses"


def _xlsx(rows: list[list[object]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def _preview(client: AsyncClient, name: str, content: bytes):
    return await client.post(f"{EXPENSES}/import/preview", files={"file": (name, content)})


# --------------------------------------------------------------------- bulk


async def test_bulk_create_saves_all(auth_client: AsyncClient):
    items = [
        {"name": "Lunch", "amount": "1200", "category_id": 1, "spent_at": "2026-11-01T08:00:00Z"},
        {"name": "Fuel", "amount": "3000.50", "category_id": 9},
    ]
    r = await auth_client.post(f"{EXPENSES}/bulk", json={"items": items})
    assert r.status_code == 201, r.text
    assert r.json() == {"created": 2, "total_amount": "4200.50"}

    listed = (await auth_client.get(EXPENSES)).json()
    assert listed["total"] == 2


async def test_bulk_create_is_all_or_nothing(auth_client: AsyncClient):
    items = [
        {"name": "Good", "amount": "100", "category_id": 1},
        {"name": "Bad category", "amount": "100", "category_id": 999},
    ]
    r = await auth_client.post(f"{EXPENSES}/bulk", json={"items": items})
    assert r.status_code == 400
    assert "row 2" in r.json()["error"]["message"]
    assert (await auth_client.get(EXPENSES)).json()["total"] == 0


async def test_bulk_create_validates_amounts(auth_client: AsyncClient):
    r = await auth_client.post(
        f"{EXPENSES}/bulk", json={"items": [{"name": "Zero", "amount": "0", "category_id": 1}]}
    )
    assert r.status_code == 422
    r = await auth_client.post(f"{EXPENSES}/bulk", json={"items": []})
    assert r.status_code == 422


# ------------------------------------------------------------------- import


async def test_preview_xlsx_with_loose_headers(auth_client: AsyncClient):
    content = _xlsx(
        [
            ["Item", "Price", "Type", "When", "Remarks"],
            ["Dinner", 2500, "food", datetime(2026, 10, 3, 20, 15), "with friends"],
            [None, None, None, None, None],  # blank row → skipped
            ["Uber to office", "Rs 450", "", "05/10/2026", ""],
            ["Mystery", "abc", "Spaceships", "not a date", ""],
        ]
    )
    r = await _preview(auth_client, "mine.xlsx", content)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["skipped"] == 1
    rows = data["rows"]
    assert len(rows) == 3

    assert rows[0]["name"] == "Dinner"
    assert rows[0]["amount"] == "2500.00"
    assert rows[0]["category_id"] == 1  # "food" → Food/Dine out
    assert rows[0]["spent_at"] == "2026-10-03T20:15"
    assert rows[0]["description"] == "with friends"
    assert rows[0]["warnings"] == []

    assert rows[1]["amount"] == "450.00"
    assert rows[1]["category_id"] == 5  # guessed "travel" from the name ("uber")
    assert rows[1]["spent_at"] == "2026-10-05T12:00"  # day-first, date only → midday

    assert rows[2]["amount"] is None
    assert rows[2]["category_id"] == 6  # unknown → Miscellaneous, flagged
    assert set(rows[2]["warnings"]) == {
        "Amount isn't a number",
        "Unknown category “Spaceships”",
        "Couldn't read the date",
    }

    # Preview saves nothing.
    assert (await auth_client.get(EXPENSES)).json()["total"] == 0


async def test_preview_pasted_tsv_without_header(auth_client: AsyncClient):
    pasted = "Groceries\t1.5k\tGrocery\t2026-11-02\nNetflix\t1100\tentertainment\t\n"
    r = await _preview(auth_client, "paste.tsv", pasted.encode())
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert [x["name"] for x in rows] == ["Groceries", "Netflix"]
    assert rows[0]["amount"] == "1500.00"
    assert rows[0]["category_id"] == 7
    assert rows[1]["category_id"] == 4
    assert rows[1]["spent_at"] is None


async def test_preview_rejects_bad_files(auth_client: AsyncClient):
    r = await _preview(auth_client, "old.xls", b"\xd0\xcf\x11\xe0")
    assert r.status_code == 400
    r = await _preview(auth_client, "empty.csv", b"\n\n")
    assert r.status_code == 400
    r = await _preview(auth_client, "huge.csv", b"a,1\n" * 600_000)
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "file_too_large"


async def test_template_round_trips(auth_client: AsyncClient):
    r = await auth_client.get(f"{EXPENSES}/import/template")
    assert r.status_code == 200
    wb = load_workbook(io.BytesIO(r.content))
    assert [c.value for c in wb["Expenses"][1]] == [
        "Name", "Amount", "Category", "Date", "Time", "Note"
    ]
    assert wb["Categories"].max_row >= 5

    # The template's own example rows import cleanly, times included.
    p = await _preview(auth_client, "spendjot-import-template.xlsx", r.content)
    assert p.status_code == 200
    rows = p.json()["rows"]
    assert len(rows) == 3
    assert all(row["warnings"] == [] for row in rows)
    assert [row["spent_at"][11:] for row in rows] == ["13:30", "09:15", "12:00"]


async def test_preview_separate_time_column(auth_client: AsyncClient):
    from datetime import time as dtime

    content = _xlsx(
        [
            ["Name", "Amount", "Date", "Time"],
            ["Excel time cell", 100, datetime(2026, 11, 1), dtime(14, 30)],
            ["12h text", 100, "2026-11-01", "2:05 pm"],
            ["Day fraction", 100, "2026-11-01", 0.75],  # unformatted Excel 18:00
            ["Time beats date-time", 100, datetime(2026, 11, 1, 8, 0), "21:10"],
            ["No time", 100, "2026-11-01", None],
            ["Bad time", 100, "2026-11-01", "lunchtime"],
        ]
    )
    r = await _preview(auth_client, "times.xlsx", content)
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert [x["spent_at"] for x in rows] == [
        "2026-11-01T14:30",
        "2026-11-01T14:05",
        "2026-11-01T18:00",
        "2026-11-01T21:10",
        "2026-11-01T12:00",
        "2026-11-01T12:00",
    ]
    assert rows[5]["warnings"] == ["Couldn't read the time"]


async def test_paste_positional_time_or_note(auth_client: AsyncClient):
    pasted = (
        "Chai\t120\tFood\t2026-11-21\t08:15\tmorning\n"  # 6 cols: …, Date, Time, Note
        "Fuel\t3000\tbike\t2026-11-21\tfull tank\n"  # old 5 cols: …, Date, Note
    )
    r = await _preview(auth_client, "paste.tsv", pasted.encode())
    assert r.status_code == 200, r.text
    chai, fuel = r.json()["rows"]
    assert chai["spent_at"] == "2026-11-21T08:15"
    assert chai["description"] == "morning"
    assert fuel["spent_at"] == "2026-11-21T12:00"
    assert fuel["description"] == "full tank"
    assert fuel["warnings"] == []
