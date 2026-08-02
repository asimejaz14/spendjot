from __future__ import annotations

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.budget import BudgetOut, BudgetProgress, BudgetSet
from app.services import budget_service

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
async def list_budgets(db: DbSession, current_user: CurrentUser) -> list[BudgetOut]:
    items = await budget_service.list_budgets(db, current_user)
    return [BudgetOut.model_validate(b) for b in items]


@router.get("/progress", response_model=BudgetProgress)
async def budget_progress(db: DbSession, current_user: CurrentUser) -> BudgetProgress:
    return await budget_service.get_progress(db, current_user)


@router.put("", response_model=BudgetOut)
async def set_budget(
    payload: BudgetSet, db: DbSession, current_user: CurrentUser
) -> BudgetOut:
    budget = await budget_service.set_budget(
        db, current_user, payload.category_id, payload.amount
    )
    return BudgetOut.model_validate(budget)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    db: DbSession,
    current_user: CurrentUser,
    category_id: int | None = Query(
        default=None, description="Omit to delete the overall budget"
    ),
) -> Response:
    await budget_service.delete_budget(db, current_user, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
