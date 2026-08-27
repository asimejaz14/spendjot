from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DailySeries, DashboardSummary, Insights, MonthlySeries
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def summary(db: DbSession, current_user: CurrentUser) -> DashboardSummary:
    return await dashboard_service.get_summary(db, current_user)


@router.get("/insights", response_model=Insights)
async def insights(db: DbSession, current_user: CurrentUser) -> Insights:
    return await dashboard_service.get_insights(db, current_user)


@router.get("/monthly", response_model=MonthlySeries)
async def monthly(
    db: DbSession,
    current_user: CurrentUser,
    months: int = Query(default=6, ge=1, le=24),
) -> MonthlySeries:
    return await dashboard_service.get_monthly_series(db, current_user, months=months)


@router.get("/daily", response_model=DailySeries)
async def daily(db: DbSession, current_user: CurrentUser) -> DailySeries:
    """Per-day spending for the current month (for the dashboard line chart)."""
    return await dashboard_service.get_daily_series(db, current_user)
