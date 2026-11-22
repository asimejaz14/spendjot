"""Bulk import: turn a spreadsheet (or pasted cells) into reviewable draft rows.

Nothing here writes to the database. The frontend shows the drafts in an
editable grid, the user fixes anything flagged, then saves via the bulk-create
endpoint. Accepts .xlsx, .csv and tab-separated text (what Excel/Sheets put on
the clipboard). Headers are matched loosely ("Item", "Price", "When"…); without
a recognisable header row the columns are read as Name, Amount, Category, Date,
Time, Note (a 5th cell that isn't a time is taken as the Note). A Time column
overrides any time inside the Date cell; rows with no time default to midday.
"""
from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.models.category import Category
from app.services.parse_service import guess_category

MAX_ROWS = 200
MAX_BYTES = 2 * 1024 * 1024  # 2 MB is thousands of rows; anything bigger is a mistake.

COLUMNS = ("name", "amount", "category", "date", "time", "note")
_HEADER_ALIASES: dict[str, set[str]] = {
    "name": {"name", "item", "expense", "title", "what", "details", "particulars", "spent on"},
    "amount": {"amount", "price", "cost", "total", "rs", "pkr", "value", "amount (rs)", "spent"},
    "category": {"category", "type", "group", "kind"},
    "date": {"date", "spent_at", "spent at", "when", "day", "datetime", "date & time"},
    "time": {"time", "at", "hour", "time of day"},
    "note": {"note", "notes", "description", "comment", "comments", "memo", "remarks"},
}

_TIME_FORMATS = ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M:%S %p", "%I:%M%p", "%I %p", "%I%p")

_DATE_FORMATS = (
    "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d",
    "%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y %H:%M", "%d-%m-%Y", "%d.%m.%Y",
    "%d %b %Y %H:%M", "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y", "%d %b %y", "%d/%m/%y",
)


@dataclass
class DraftRow:
    name: str = ""
    amount: Decimal | None = None
    category_id: int | None = None
    # Naive local "YYYY-MM-DDTHH:MM" — the browser applies the user's timezone.
    spent_at: str | None = None
    description: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ImportResult:
    rows: list[DraftRow]
    skipped: int  # blank rows ignored
    truncated: bool  # more than MAX_ROWS rows were present


# ----------------------------------------------------------------- reading


def _read_table(filename: str, content: bytes) -> list[list[object]]:
    if len(content) > MAX_BYTES:
        raise AppError("That file is too large — keep it under 2 MB.", code="file_too_large")
    name = filename.lower()
    if name.endswith(".xlsx") or content[:2] == b"PK":
        try:
            wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        except Exception as exc:  # corrupt / not really xlsx
            raise AppError(
                "We couldn't open that Excel file. Save it as .xlsx and try again.",
                code="bad_file",
            ) from exc
        ws = wb.worksheets[0]
        rows = [list(r) for r in ws.iter_rows(values_only=True)]
        wb.close()
        return rows
    if name.endswith((".xls", ".numbers", ".ods")):
        raise AppError("Please save the sheet as .xlsx or .csv first.", code="bad_file")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    sample = text[:4096]
    delimiter = "\t" if "\t" in sample else ","
    if delimiter == "," and sample.count(";") > sample.count(","):
        delimiter = ";"
    return [list(r) for r in csv.reader(io.StringIO(text), delimiter=delimiter)]


def _is_blank(row: list[object]) -> bool:
    return all(c is None or str(c).strip() == "" for c in row)


def _norm(v: object) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip().lower()


def _header_map(row: list[object]) -> dict[str, int] | None:
    """Column index per field when `row` looks like a header, else None."""
    found: dict[str, int] = {}
    for idx, cell in enumerate(row):
        label = _norm(cell).rstrip(":")
        for col, aliases in _HEADER_ALIASES.items():
            if col not in found and label in aliases:
                found[col] = idx
                break
    if len(found) < 2:
        return None
    # "Description" alone (no name column) is the expense name, not a note.
    if "name" not in found and "note" in found:
        found["name"] = found.pop("note")
    return found


# ----------------------------------------------------------------- parsing


def _parse_amount(v: object) -> Decimal | None:
    if v is None or v == "":
        return None
    if isinstance(v, (int, float, Decimal)) and not isinstance(v, bool):
        return Decimal(str(v)).quantize(Decimal("0.01"))
    s = str(v).lower().replace(",", "")
    s = re.sub(r"(rs\.?|pkr|₨|\s)", "", s)
    mult = Decimal(1)
    if s.endswith("k"):
        mult, s = Decimal(1000), s[:-1]
    try:
        return (Decimal(s) * mult).quantize(Decimal("0.01"))
    except InvalidOperation:
        return None


def _parse_date(v: object) -> tuple[str | None, bool]:
    """(naive "YYYY-MM-DDTHH:MM" | None, had_a_value)."""
    if v is None or str(v).strip() == "":
        return None, False
    if isinstance(v, datetime):
        # Excel has no date-only type: a typed date reads back as 00:00. Treat
        # exact midnight as "no time given" → midday, like date-only text.
        dt = v.replace(hour=12, minute=0) if v.time() == time(0, 0) else v
    elif isinstance(v, date):
        dt = datetime.combine(v, time(12, 0))
    else:
        s = re.sub(r"\s+", " ", str(v)).strip().replace(",", "")
        dt = None
        for fmt in _DATE_FORMATS:
            try:
                dt = datetime.strptime(s, fmt)
                break
            except ValueError:
                continue
        if dt is None:
            return None, True
        if "%H" not in fmt:  # date only → midday, so timezones can't shift the day
            dt = dt.replace(hour=12, minute=0)
    return dt.strftime("%Y-%m-%dT%H:%M"), True


def _parse_time(v: object) -> tuple[time | None, bool]:
    """(time | None, had_a_value). Accepts Excel time cells, day fractions,
    "14:30", "2:30 PM", "2pm"…"""
    if v is None or str(v).strip() == "":
        return None, False
    if isinstance(v, datetime):  # Excel sometimes stores times as 1899-12-30 hh:mm
        return v.time().replace(second=0, microsecond=0), True
    if isinstance(v, time):
        return v.replace(second=0, microsecond=0), True
    if isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v < 1:
        minutes = round(float(v) * 24 * 60)  # unformatted Excel time = fraction of a day
        return time(minutes // 60 % 24, minutes % 60), True
    s = re.sub(r"\s+", " ", str(v)).strip().upper()
    s = s.replace("A.M.", "AM").replace("P.M.", "PM")
    if ":" not in s:
        s = s.replace(".", ":", 1)  # "14.30" → "14:30"
    for fmt in _TIME_FORMATS:
        try:
            return datetime.strptime(s, fmt).time(), True
        except ValueError:
            continue
    return None, True


def _match_category(
    raw: str, name: str, by_name: dict[str, Category], by_slug: dict[str, Category]
) -> Category | None:
    key = _norm(raw)
    if key:
        if key in by_name:
            return by_name[key]
        if key in by_slug:
            return by_slug[key]
        for cname, cat in by_name.items():  # "food" → "Food/Dine out", "bike" → "Bike/Car…"
            if cname.startswith(key) or key in cname.split("/"):
                return cat
        hit = guess_category(key, by_slug)
        if hit:
            return hit
    return guess_category(name, by_slug)


async def parse_table(db: AsyncSession, filename: str, content: bytes) -> ImportResult:
    table = _read_table(filename, content)

    categories = list(
        (await db.scalars(select(Category).where(Category.is_active.is_(True)))).all()
    )
    by_slug = {c.slug: c for c in categories}
    by_name = {_norm(c.name): c for c in categories}

    # Header: the first non-blank row, if it names at least two columns.
    first = next((i for i, r in enumerate(table) if not _is_blank(r)), None)
    if first is None:
        raise AppError("That sheet looks empty.", code="empty_file")
    cols = _header_map(table[first])
    data = table[first + 1 :] if cols else table[first:]
    positional = cols is None
    if cols is None:
        cols = {c: i for i, c in enumerate(COLUMNS)}

    def cell(row: list[object], col: str) -> object:
        i = cols.get(col)
        return row[i] if i is not None and i < len(row) else None

    rows: list[DraftRow] = []
    skipped = 0
    truncated = False
    for raw in data:
        if _is_blank(raw):
            skipped += 1
            continue
        if len(rows) >= MAX_ROWS:
            truncated = True
            break

        d = DraftRow()
        d.name = re.sub(r"\s+", " ", str(cell(raw, "name") or "")).strip()[:120]
        if not d.name:
            d.warnings.append("Missing name")

        amount_raw = cell(raw, "amount")
        d.amount = _parse_amount(amount_raw)
        if d.amount is None:
            d.warnings.append("Missing amount" if amount_raw in (None, "") else "Amount isn't a number")
        elif d.amount <= 0:
            d.warnings.append("Amount must be more than 0")

        cat_raw = str(cell(raw, "category") or "")
        cat = _match_category(cat_raw, d.name, by_name, by_slug)
        if cat is None:
            cat = by_slug.get("misc")
            if cat_raw.strip():
                d.warnings.append(f"Unknown category “{cat_raw.strip()[:30]}”")
        d.category_id = cat.id if cat else None

        d.spent_at, had_date = _parse_date(cell(raw, "date"))
        if had_date and d.spent_at is None:
            d.warnings.append("Couldn't read the date")

        time_raw, note_raw = cell(raw, "time"), cell(raw, "note")
        t, had_time = _parse_time(time_raw)
        if positional and had_time and t is None and note_raw in (None, ""):
            # Header-less paste in the older 5-column shape (…, Date, Note):
            # the 5th cell isn't a time, so it's the note.
            t, had_time, note_raw = None, False, time_raw
        if had_time and t is None:
            d.warnings.append("Couldn't read the time")
        elif t is not None:
            # A Time column wins over any time inside the Date cell. With no
            # date at all, the time applies to today.
            day = d.spent_at[:10] if d.spent_at else date.today().isoformat()
            if d.spent_at or not had_date:
                d.spent_at = f"{day}T{t.strftime('%H:%M')}"

        note = str(note_raw or "").strip()
        d.description = note[:2000] or None
        rows.append(d)

    if not rows:
        raise AppError("We couldn't find any expenses in that sheet.", code="empty_file")
    return ImportResult(rows=rows, skipped=skipped, truncated=truncated)


# ---------------------------------------------------------------- template


async def build_template(db: AsyncSession) -> bytes:
    """A ready-to-fill .xlsx: headers, examples, a category dropdown, time column."""
    categories = list(
        (
            await db.scalars(
                select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order)
            )
        ).all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Expenses"
    headers = ["Name", "Amount", "Category", "Date", "Time", "Note"]
    ws.append(headers)
    head_fill = PatternFill("solid", fgColor="153D30")
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
    today = date.today()
    first_cat = categories[0].name if categories else ""
    ws.append(["Lunch at Kolachi", 1500, first_cat, today, time(13, 30), ""])
    ws.append(["Careem ride", 450, "Travel", today, time(9, 15), "Office"])
    ws.append(["Groceries (no time → 12:00 PM)", 3200, "Grocery", today, None, ""])
    # Pre-format the whole input range so typed dates/times stay real Excel values.
    last = MAX_ROWS + 1
    for (c,) in ws.iter_rows(min_row=2, max_row=last, min_col=4, max_col=4):
        c.number_format = "yyyy-mm-dd"
    for (c,) in ws.iter_rows(min_row=2, max_row=last, min_col=5, max_col=5):
        c.number_format = "h:mm AM/PM"
    for col, width in zip("ABCDEF", (32, 12, 22, 14, 12, 30)):
        ws.column_dimensions[col].width = width
    ws.freeze_panes = "A2"

    ref = wb.create_sheet("Categories")
    for c in categories:
        ref.append([c.name])
    ref.column_dimensions["A"].width = 26
    if categories:
        dv = DataValidation(
            type="list", formula1=f"=Categories!$A$1:$A${len(categories)}", allow_blank=True
        )
        ws.add_data_validation(dv)
        dv.add(f"C2:C{MAX_ROWS + 1}")

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
