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
    BiggestExpense,
    CategoryBreakdown,
    CategoryMover,
    DashboardSummary,
    Insights,
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


async def get_insights(db: AsyncSession, user: User) -> Insights:
    """Plain-English highlights: this vs last month, top mover, biggest expense."""
    now = now_utc()
    this_start = month_start(now)
    next_start = add_months(this_start, 1)
    last_start = add_months(this_start, -1)

    stmt = (
        select(Expense)
        .where(
            Expense.user_id == user.id,
            Expense.spent_at >= last_start,
            Expense.spent_at < next_start,
        )
        .options(selectinload(Expense.category))
    )
    expenses = list((await db.scalars(stmt)).all())

    this_total = Decimal(0)
    last_total = Decimal(0)
    this_by_cat: dict[int, Decimal] = defaultdict(lambda: Decimal(0))
    last_by_cat: dict[int, Decimal] = defaultdict(lambda: Decimal(0))
    cat_meta: dict[int, object] = {}
    biggest: Expense | None = None

    for e in expenses:
        cat_meta[e.category_id] = e.category
        if as_utc(e.spent_at) >= this_start:
            this_total += e.amount
            this_by_cat[e.category_id] += e.amount
            if biggest is None or e.amount > biggest.amount:
                biggest = e
        else:
            last_total += e.amount
            last_by_cat[e.category_id] += e.amount

    delta_pct = float((this_total - last_total) / last_total) if last_total > 0 else None

    top_mover = None
    cat_ids = set(this_by_cat) | set(last_by_cat)
    if cat_ids:
        cid = max(
            cat_ids,
            key=lambda c: abs(this_by_cat.get(c, Decimal(0)) - last_by_cat.get(c, Decimal(0))),
        )
        cat = cat_meta[cid]
        this_c = this_by_cat.get(cid, Decimal(0))
        last_c = last_by_cat.get(cid, Decimal(0))
        if this_c != last_c:  # only a "mover" if something actually changed
            top_mover = CategoryMover(
                category_id=cid,
                name=cat.name,
                icon=cat.icon,
                this_month=this_c,
                last_month=last_c,
                delta=this_c - last_c,
            )

    biggest_expense = (
        BiggestExpense(
            name=biggest.name,
            amount=biggest.amount,
            category_name=biggest.category.name,
        )
        if biggest is not None
        else None
    )

    return Insights(
        this_month_label=f"{MONTH_NAMES[now.month - 1]} {now.year}",
        this_month_total=this_total,
        last_month_total=last_total,
        delta_pct=delta_pct,
        top_mover=top_mover,
        biggest_expense=biggest_expense,
    )
