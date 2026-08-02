"""Best-effort natural-language expense parser.

Turns free text like "shisha 500 yesterday" into a draft expense
{name, amount, category_id, spent_at} for the user to review before saving.
Rule-based (no external calls) — keeps it fast, free, and predictable.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.timeutils import now_utc
from app.models.category import Category

# Keyword → category slug. First matching slug (by hit count) wins; falls back to misc.
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food": ["food", "lunch", "dinner", "breakfast", "restaurant", "dine", "eat",
             "meal", "coffee", "snack", "tea", "burger", "pizza", "biryani"],
    "grocery": ["grocery", "groceries", "supermarket", "mart", "vegetables", "fruit", "fruits"],
    "utility": ["utility", "bill", "electricity", "gas", "water", "internet", "wifi"],
    "medical": ["medical", "medicine", "meds", "doctor", "pharmacy", "hospital", "clinic"],
    "shisha": ["shisha", "hookah", "sheesha"],
    "entertainment": ["entertainment", "movie", "cinema", "game", "netflix", "concert"],
    "maintenance": ["maintenance", "repair", "service", "mechanic", "fuel", "petrol", "oil"],
    "travel": ["travel", "uber", "careem", "cab", "taxi", "bus", "flight", "fare", "ride"],
    "pets": ["pet", "pets", "dog", "cat", "vet"],
}

_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_AMOUNT_RE = re.compile(r"(\d[\d,]*(?:\.\d+)?)(k)?\b", re.IGNORECASE)
_DAYS_AGO_RE = re.compile(r"(\d+)\s*days?\s*ago", re.IGNORECASE)


@dataclass
class ParsedExpense:
    name: str
    amount: Decimal | None
    category_id: int | None
    category_name: str | None
    spent_at: object  # datetime


def _parse_amount(text: str) -> tuple[Decimal | None, str | None]:
    m = _AMOUNT_RE.search(text)
    if not m:
        return None, None
    try:
        amount = Decimal(m.group(1).replace(",", ""))
    except InvalidOperation:
        return None, None
    if m.group(2):  # trailing "k" -> thousands
        amount *= 1000
    return amount, m.group(0)


def _parse_date(text: str):
    """Return (datetime, matched_phrase|None). Time-of-day is kept as 'now'."""
    now = now_utc()
    low = text.lower()

    if "today" in low:
        return now, "today"
    if "yesterday" in low:
        return now - timedelta(days=1), "yesterday"

    m = _DAYS_AGO_RE.search(low)
    if m:
        return now - timedelta(days=int(m.group(1))), m.group(0)

    for i, wd in enumerate(_WEEKDAYS):
        if wd in low:
            delta = (now.weekday() - i) % 7
            delta = delta or 7  # "monday" on a Monday means last Monday
            phrase = f"last {wd}" if f"last {wd}" in low else wd
            return now - timedelta(days=delta), phrase

    return now, None


async def parse_expense(db: AsyncSession, text: str) -> ParsedExpense:
    raw = text.strip()
    low = raw.lower()

    amount, amount_phrase = _parse_amount(raw)
    spent_at, date_phrase = _parse_date(raw)

    categories = list(
        (await db.scalars(select(Category).where(Category.is_active.is_(True)))).all()
    )
    by_slug = {c.slug: c for c in categories}

    scores: dict[str, int] = {}
    for slug, keywords in _CATEGORY_KEYWORDS.items():
        if slug not in by_slug:
            continue
        hits = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", low))
        if hits:
            scores[slug] = hits

    category = None
    if scores:
        category = by_slug[max(scores, key=lambda s: scores[s])]
    elif "misc" in by_slug:
        category = by_slug["misc"]

    # Name = the text minus the amount and date phrases.
    name = raw
    for phrase in (amount_phrase, date_phrase):
        if phrase:
            name = re.sub(re.escape(phrase), " ", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+", " ", name).strip(" -,·").strip()
    if not name:
        name = category.name if category else "Expense"
    name = name[:1].upper() + name[1:]

    return ParsedExpense(
        name=name,
        amount=amount,
        category_id=category.id if category else None,
        category_name=category.name if category else None,
        spent_at=spent_at,
    )
