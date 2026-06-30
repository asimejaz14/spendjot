from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardSummary, MonthlySeries
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: DbSession, current_user: CurrentUser) -> DashboardSummary:
    return await dashboard_service.get_summary(db, current_user)


@router.get("/monthly", response_model=MonthlySeries)
async def monthly(
    db: DbSession,
    current_user: CurrentUser,
    months: int = Query(default=6, ge=1, le=24),
) -> MonthlySeries:
    return await dashboard_service.get_monthly_series(db, current_user, months=months)
