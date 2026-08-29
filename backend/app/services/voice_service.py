"""Natural-language expense extraction for the Siri/Shortcuts voice flow.

Turns a dictated phrase ("twelve hundred fuel yesterday") into a structured
draft {name, amount, category_id, spent_at}. Prefers Azure OpenAI; if that
isn't configured (or the call fails) it transparently falls back to the
built-in rule-based parser so the feature always works.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.timeutils import now_utc
from app.models.category import Category
from app.services import parse_service

logger = logging.getLogger("spendjot.voice")

_MISC_SLUG = "misc"


@dataclass
class ExtractedExpense:
    name: str
    amount: Decimal | None
    category_id: int | None
    category_name: str | None
    spent_at: datetime  # UTC
    confidence: float  # 0..1
    source: str  # "azure" | "rules"


async def _active_categories(db: AsyncSession) -> list[Category]:
    return list(
        (await db.scalars(select(Category).where(Category.is_active.is_(True)))).all()
    )


def _resolve_tz(name: str | None):
    if not name:
        return timezone.utc
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo(name)
    except Exception:  # noqa: BLE001 — unknown tz → UTC
        return timezone.utc


def _client_now(client_now: datetime | None, tz) -> datetime:
    """The 'now' to anchor relative dates against, as an aware datetime in tz."""
    if client_now is None:
        return datetime.now(tz)
    if client_now.tzinfo is None:
        return client_now.replace(tzinfo=tz)
    return client_now.astimezone(tz)


def _to_utc(dt: datetime, tz) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=tz)
    return dt.astimezone(timezone.utc)


async def extract_expense(
    db: AsyncSession,
    *,
    text: str,
    client_now: datetime | None,
    client_tz: str | None,
) -> ExtractedExpense:
    if settings.azure_openai_enabled:
        try:
            return await _extract_via_azure(db, text, client_now, client_tz)
        except Exception as exc:  # noqa: BLE001 — never fail the request on AI issues
            logger.warning("Azure extraction failed, falling back to rules: %s", exc)
    return await _extract_via_rules(db, text)


async def _extract_via_rules(db: AsyncSession, text: str) -> ExtractedExpense:
    draft = await parse_service.parse_expense(db, text)
    spent_at = draft.spent_at
    if not isinstance(spent_at, datetime):
        spent_at = now_utc()
    return ExtractedExpense(
        name=draft.name,
        amount=draft.amount,
        category_id=draft.category_id,
        category_name=draft.category_name,
        spent_at=spent_at,
        confidence=1.0 if draft.amount is not None else 0.0,
        source="rules",
    )


def _build_prompt(categories: list[Category], anchor: datetime) -> str:
    cat_lines = "\n".join(f"  {c.id} = {c.name}" for c in categories)
    return (
        "You extract a single expense from a short spoken phrase for a personal "
        "expense tracker. Reply with ONLY a JSON object, no prose.\n\n"
        "Fields:\n"
        '  "name": short human label for the expense (e.g. "Groceries", "Uber ride"). Required.\n'
        '  "amount": the number spent, as a plain number (no currency symbol). '
        'Interpret "k" as thousands ("1.2k" = 1200). null if you truly cannot find one.\n'
        '  "category_id": pick the best-fitting id from the list below. Use '
        f"{_misc_id(categories)} (Miscellaneous) if nothing fits.\n"
        '  "spent_at": ISO-8601 local datetime for when it was spent. Resolve '
        'relative dates ("yesterday", "this morning", "last friday") against the '
        f"current local time given below. Default to the current time if unspecified.\n"
        '  "confidence": 0..1 for how sure you are overall (mainly the amount).\n\n'
        f"Categories (id = name):\n{cat_lines}\n\n"
        f"Current local time: {anchor.isoformat()}\n"
        "Currency is Pakistani Rupees; amounts are whole numbers unless decimals "
        "are clearly stated."
    )


def _misc_id(categories: list[Category]) -> int:
    for c in categories:
        if c.slug == _MISC_SLUG:
            return c.id
    return categories[0].id if categories else 0


async def _extract_via_azure(
    db: AsyncSession,
    text: str,
    client_now: datetime | None,
    client_tz: str | None,
) -> ExtractedExpense:
    from openai import AsyncAzureOpenAI

    categories = await _active_categories(db)
    tz = _resolve_tz(client_tz)
    anchor = _client_now(client_now, tz)

    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
    )
    resp = await client.chat.completions.create(
        model=settings.azure_openai_deployment,  # Azure = deployment name
        messages=[
            {"role": "system", "content": _build_prompt(categories, anchor)},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        temperature=0,
        max_tokens=200,
    )
    data = json.loads(resp.choices[0].message.content or "{}")

    by_id = {c.id: c for c in categories}
    cat = by_id.get(_coerce_int(data.get("category_id")))
    if cat is None:
        cat = by_id.get(_misc_id(categories))

    amount = _coerce_amount(data.get("amount"))
    spent_at = _resolve_spent_at(data.get("spent_at"), tz, anchor)

    name = str(data.get("name") or "").strip()[:120]
    if not name:
        name = cat.name if cat else "Expense"

    confidence = _coerce_float(data.get("confidence"), default=0.8)
    if amount is None:
        confidence = min(confidence, 0.2)

    return ExtractedExpense(
        name=name,
        amount=amount,
        category_id=cat.id if cat else None,
        category_name=cat.name if cat else None,
        spent_at=spent_at,
        confidence=confidence,
        source="azure",
    )


def _coerce_int(value: object) -> int | None:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _coerce_float(value: object, *, default: float) -> float:
    try:
        return max(0.0, min(1.0, float(value)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _coerce_amount(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    if amount <= 0:
        return None
    return amount.quantize(Decimal("0.01"))


def _resolve_spent_at(value: object, tz, anchor: datetime) -> datetime:
    if not value:
        return _to_utc(anchor, tz)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return _to_utc(anchor, tz)
    return _to_utc(dt, tz)
