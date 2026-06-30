from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Money
from app.schemas.expense import ExpenseOut


class CategoryBreakdown(BaseModel):
    category_id: int
    slug: str
    name: str
    icon: str
    total: Money
    count: int


class DashboardSummary(BaseModel):
    # "Closing balance" reframed as total spent this month.
    month_total: Money
    month_label: str  # e.g. "June 2026"
    expense_count: int
    daily_average: Money
    top_category: CategoryBreakdown | None
    by_category: list[CategoryBreakdown]
    recent: list[ExpenseOut]


class MonthlyPoint(BaseModel):
    month: str  # ISO "YYYY-MM"
    label: str  # "Jun 2026"
    total: Money
    count: int


class MonthlySeries(BaseModel):
    points: list[MonthlyPoint]
