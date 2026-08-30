from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUserOrToken, DbSession
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseOut
from app.schemas.voice import VoiceExpenseRequest, VoiceExpenseResponse
from app.services import expense_service, voice_service

router = APIRouter(prefix="/voice", tags=["voice"])


def _spoken_amount(amount: Decimal) -> str:
    """A TTS-friendly amount, e.g. '1,250 rupees'."""
    return f"{int(amount):,} rupees"


@router.post("/expense", response_model=VoiceExpenseResponse)
async def voice_expense(
    payload: VoiceExpenseRequest,
    db: DbSession,
    current_user: CurrentUserOrToken,
) -> VoiceExpenseResponse:
    """One-shot: extract an expense from a dictated phrase and save it.

    Always returns 200 with a `spoken` line so Siri can read the result back —
    including the case where no amount could be understood (nothing is saved).
    """
    extracted = await voice_service.extract_expense(
        db,
        text=payload.text,
        client_now=payload.client_now,
        client_tz=payload.client_tz,
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
