from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import Money


class BudgetSet(BaseModel):
    """Upsert a budget. ``category_id`` NULL/omitted sets the overall budget."""

    category_id: int | None = None
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category_id: int | None
    amount: Money


class BudgetLine(BaseModel):
    """Per-category budget vs. this month's spend."""

    category_id: int
    slug: str | None
    name: str
    icon: str | None
    budget: Money
    spent: Money
    remaining: Money  # budget - spent (negative once over)
    pct: float  # spent / budget (0..>1)


class OverallProgress(BaseModel):
    budget: Money | None
    spent: Money
    remaining: Money | None
    pct: float | None
    safe_per_day: Money | None  # what's left to spend, spread over remaining days
    projected_month_end: Money  # extrapolated from the current run-rate
    on_track: bool | None  # spent <= linear pace for the month


class BudgetProgress(BaseModel):
    month_label: str
    day_of_month: int
    days_in_month: int
    days_left: int  # including today
    overall: OverallProgress
    categories: list[BudgetLine]
