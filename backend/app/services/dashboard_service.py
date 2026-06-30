"""Aggregations powering the dashboard and history charts (user-scoped)."""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timeutils import (
    MONTH_ABBR,
    MONTH_NAMES,
    add_months,
    as_utc,
    month_start,
    now_utc,
)
from app.models.expense import Expense
from app.models.user import User
from app.schemas.dashboard import (
    CategoryBreakdown,
    DashboardSummary,
    MonthlyPoint,
    MonthlySeries,
)


async def get_summary(db: AsyncSession, user: User, recent_limit: int = 8) -> DashboardSummary:
    now = now_utc()
    start = month_start(now)
    nxt = add_months(now, 1)

    stmt = (
        select(Expense)
        .where(
            Expense.user_id == user.id,
            Expense.spent_at >= start,
            Expense.spent_at < nxt,
        )
        .options(selectinload(Expense.category))
        .order_by(Expense.spent_at.desc(), Expense.created_at.desc())
    )
    expenses = list((await db.scalars(stmt)).all())

    month_total = sum((e.amount for e in expenses), Decimal(0))
    count = len(expenses)

    buckets: dict[int, dict] = defaultdict(lambda: {"total": Decimal(0), "count": 0})
    for e in expenses:
        b = buckets[e.category_id]
        b["total"] += e.amount
        b["count"] += 1
        b["category"] = e.category

    by_category = [
        CategoryBreakdown(
            category_id=cid,
            slug=data["category"].slug,
            name=data["category"].name,
            icon=data["category"].icon,
            total=data["total"],
            count=data["count"],
        )
        for cid, data in buckets.items()
    ]
    by_category.sort(key=lambda c: c.total, reverse=True)
    top_category = by_category[0] if by_category else None

    days_elapsed = max(1, now.day)
    daily_average = (month_total / days_elapsed).quantize(Decimal("0.01")) if count else Decimal(0)

    return DashboardSummary(
        month_total=month_total,
        month_label=f"{MONTH_NAMES[now.month - 1]} {now.year}",
        expense_count=count,
        daily_average=daily_average,
        top_category=top_category,
        by_category=by_category,
        recent=expenses[:recent_limit],  # type: ignore[arg-type]
    )


async def get_monthly_series(db: AsyncSession, user: User, months: int = 6) -> MonthlySeries:
    now = now_utc()
    start = add_months(now, -(months - 1))

    stmt = select(Expense).where(
        Expense.user_id == user.id, Expense.spent_at >= start
    )
    expenses = list((await db.scalars(stmt)).all())

    totals: dict[str, dict] = {}
    # Pre-seed every month in range so the chart has no gaps.
    for i in range(months):
        m = add_months(start, i)
        key = f"{m.year:04d}-{m.month:02d}"
        totals[key] = {
            "total": Decimal(0),
            "count": 0,
            "label": f"{MONTH_ABBR[m.month - 1]} {m.year}",
        }

    for e in expenses:
        d = as_utc(e.spent_at)
        key = f"{d.year:04d}-{d.month:02d}"
        if key in totals:
            totals[key]["total"] += e.amount
            totals[key]["count"] += 1

    points = [
        MonthlyPoint(month=key, label=v["label"], total=v["total"], count=v["count"])
        for key, v in sorted(totals.items())
    ]
    return MonthlySeries(points=points)
