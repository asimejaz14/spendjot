"""Budgets: monthly spending limits and current-month progress (user-scoped)."""
from __future__ import annotations

import calendar
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.core.timeutils import MONTH_NAMES, add_months, month_start, now_utc
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.budget import (
    BudgetLine,
    BudgetProgress,
    OverallProgress,
)

CENTS = Decimal("0.01")


async def list_budgets(db: AsyncSession, user: User) -> list[Budget]:
    stmt = (
        select(Budget)
        .where(Budget.user_id == user.id)
        .options(selectinload(Budget.category))
    )
    return list((await db.scalars(stmt)).all())


async def _get_budget(
    db: AsyncSession, user: User, category_id: int | None
) -> Budget | None:
    stmt = select(Budget).where(Budget.user_id == user.id)
    stmt = stmt.where(
        Budget.category_id.is_(None) if category_id is None else Budget.category_id == category_id
    )
    return (await db.scalars(stmt)).first()


async def set_budget(
    db: AsyncSession, user: User, category_id: int | None, amount: Decimal
) -> Budget:
    if category_id is not None:
        exists = await db.get(Category, category_id)
        if exists is None:
            raise AppError("That category doesn't exist.", code="category_not_found", status_code=404)

    budget = await _get_budget(db, user, category_id)
    if budget is not None:
        budget.amount = amount
    else:
        budget = Budget(user_id=user.id, category_id=category_id, amount=amount)
        db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


async def delete_budget(db: AsyncSession, user: User, category_id: int | None) -> None:
    budget = await _get_budget(db, user, category_id)
    if budget is not None:
        await db.delete(budget)
        await db.commit()


async def get_progress(db: AsyncSession, user: User) -> BudgetProgress:
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
    )
    expenses = list((await db.scalars(stmt)).all())

    overall_spent = sum((e.amount for e in expenses), Decimal(0))
    spent_by_cat: dict[int, Decimal] = defaultdict(lambda: Decimal(0))
    cat_meta: dict[int, Category] = {}
    for e in expenses:
        spent_by_cat[e.category_id] += e.amount
        cat_meta[e.category_id] = e.category

    budgets = await list_budgets(db, user)
    overall_budget: Decimal | None = None
    cat_budgets: dict[int, Budget] = {}
    for b in budgets:
        if b.category_id is None:
            overall_budget = b.amount
        else:
            cat_budgets[b.category_id] = b

    days_in_month = calendar.monthrange(now.year, now.month)[1]
    day = now.day
    days_left = max(1, days_in_month - day + 1)  # includes today

    # Overall pacing.
    remaining = pct = safe_per_day = on_track = None
    if overall_budget is not None:
        remaining = overall_budget - overall_spent
        pct = float(overall_spent / overall_budget) if overall_budget > 0 else None
        safe_per_day = (max(Decimal(0), remaining) / days_left).quantize(CENTS)
        expected_by_now = overall_budget * Decimal(day) / Decimal(days_in_month)
        on_track = overall_spent <= expected_by_now
    projected = (
        (overall_spent / Decimal(day) * Decimal(days_in_month)).quantize(CENTS)
        if day > 0
        else overall_spent
    )

    lines: list[BudgetLine] = []
    for cid, b in cat_budgets.items():
        cat = b.category or cat_meta.get(cid)
        spent = spent_by_cat.get(cid, Decimal(0))
        lines.append(
            BudgetLine(
                category_id=cid,
                slug=cat.slug if cat else None,
                name=cat.name if cat else "Unknown",
                icon=cat.icon if cat else None,
                budget=b.amount,
                spent=spent,
                remaining=b.amount - spent,
                pct=float(spent / b.amount) if b.amount > 0 else 0.0,
            )
        )
    lines.sort(key=lambda line: line.pct, reverse=True)

    return BudgetProgress(
        month_label=f"{MONTH_NAMES[now.month - 1]} {now.year}",
        day_of_month=day,
        days_in_month=days_in_month,
        days_left=days_left,
        overall=OverallProgress(
            budget=overall_budget,
            spent=overall_spent,
            remaining=remaining,
            pct=pct,
            safe_per_day=safe_per_day,
            projected_month_end=projected,
            on_track=on_track,
        ),
        categories=lines,
    )
