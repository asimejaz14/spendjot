from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.api.deps import CurrentUserOrToken, DbSession
from app.core.config import settings
from app.core.exceptions import AppError
from app.models.category import Category
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut
from app.schemas.voice import (
    VoiceExpenseRequest,
    VoiceExpenseResponse,
    VoiceExtractPreview,
)
from app.services import expense_service, voice_service

router = APIRouter(prefix="/voice", tags=["voice"])

# Per-user sliding window (in-process). Keyed by user id, so it caps a leaked
# token or a stuck "Add another?" loop regardless of source IP.
_hits: dict[str, deque[float]] = defaultdict(deque)


async def _rate_limited_user(user: CurrentUserOrToken) -> User:
    """Resolve the principal AND enforce a per-user request cap. Depends on the
    same auth dependency as the endpoints, so the user is resolved only once."""
    if settings.rate_limit_enabled:
        now = time.monotonic()
        window = _hits[str(user.id)]
        cutoff = now - 60
        while window and window[0] <= cutoff:
            window.popleft()
        if len(window) >= settings.voice_rate_per_minute:
            raise AppError(
                "You're adding expenses too fast. Please wait a moment.",
                code="rate_limited",
                status_code=429,
            )
        window.append(now)
    return user


VoicePrincipal = Annotated[User, Depends(_rate_limited_user)]


def _spoken_amount(amount: Decimal) -> str:
    """A TTS-friendly amount, e.g. '1,250 rupees'."""
    return f"{int(amount):,} rupees"


async def _read_body(request: Request) -> dict:
    """Parse the request JSON as leniently as possible — a Siri Shortcut should
    never get a raw 422, so we swallow malformed bodies and return {}."""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001 — not JSON / empty body
        return {}
    return data if isinstance(data, dict) else {}


def _lenient_dt(value: object) -> datetime | None:
    """Best-effort parse of a client timestamp; ignore anything non-ISO (iOS
    'Current Date' often isn't ISO) rather than failing the request."""
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None


@router.post("/expense", response_model=VoiceExpenseResponse)
async def voice_expense(
    request: Request,
    db: DbSession,
    current_user: VoicePrincipal,
) -> VoiceExpenseResponse:
    """One-shot: extract an expense from a dictated phrase and save it.

    Parses the body leniently (no 422s for the Shortcut) and always returns 200
    with a `spoken` line so Siri can read the result back — including the cases
    where the phrase or amount couldn't be understood (nothing is saved).
    """
    body = await _read_body(request)
    text = str(body.get("text") or "").strip()
    if not text:
        return VoiceExpenseResponse(
            saved=False,
            spoken="I didn't catch that. Please say the expense again.",
        )
    client_tz = body.get("client_tz") if isinstance(body.get("client_tz"), str) else None

    extracted = await voice_service.extract_expense(
        db,
        text=text[:400],
        client_now=_lenient_dt(body.get("client_now")),
        client_tz=client_tz,
    )

    # Can't save an expense with no amount — ask the user to try again.
    if extracted.amount is None:
        return VoiceExpenseResponse(
            saved=False,
            spoken="I didn't catch the amount. Try again and include how much you spent.",
            source=extracted.source,
        )

    category_id = extracted.category_id
    if category_id is None:
        misc = (
            await db.scalars(select(Category).where(Category.slug == "misc"))
        ).first()
        category_id = misc.id if misc else None
    if category_id is None:
        return VoiceExpenseResponse(
            saved=False,
            spoken="Something went wrong saving that. Please try again.",
        )

    expense = await expense_service.create_expense(
        db,
        current_user,
        ExpenseCreate(
            name=extracted.name,
            amount=extracted.amount,
            category_id=category_id,
            description=None,
            spent_at=extracted.spent_at,
        ),
    )

    spoken = f"Saved {_spoken_amount(extracted.amount)} for {expense.category.name}."
    return VoiceExpenseResponse(
        saved=True,
        spoken=spoken,
        expense=ExpenseOut.model_validate(expense),
        source=extracted.source,
    )


@router.post("/extract-preview", response_model=VoiceExtractPreview)
async def voice_extract_preview(
    payload: VoiceExpenseRequest,
    db: DbSession,
    current_user: VoicePrincipal,
) -> VoiceExtractPreview:
    """Extract the fields from a phrase WITHOUT saving. Handy for confirming the
    Azure setup (check `source`) and iterating on phrasing without creating
    junk expenses."""
    extracted = await voice_service.extract_expense(
        db,
        text=payload.text,
        client_now=payload.client_now,
        client_tz=payload.client_tz,
    )
    return VoiceExtractPreview(
        name=extracted.name,
        amount=extracted.amount,
        category_id=extracted.category_id,
        category_name=extracted.category_name,
        spent_at=extracted.spent_at,
        confidence=extracted.confidence,
        source=extracted.source,
    )
