"""Weekly spending recap: compute per-user stats and email them.

Triggered by the protected `/internal/weekly-recap` endpoint (see the GitHub
Actions cron). Sends only to users who logged at least one expense in the last
7 days, so dormant accounts aren't emailed.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.timeutils import now_utc
from app.models.expense import Expense
from app.models.user import User
from app.services import budget_service
from app.services.email_service import send_weekly_recap_email


@dataclass
class WeeklyStats:
    week_total: Decimal
    week_count: int
    top_category: str | None
    top_category_amount: Decimal
    # Current-month budget context (overall).
    month_label: str
    month_spent: Decimal
    month_budget: Decimal | None
    month_remaining: Decimal | None
    month_pct: float | None
    safe_per_day: Decimal | None
    days_left: int


async def build_weekly_stats(db: AsyncSession, user: User) -> WeeklyStats:
    now = now_utc()
    week_start = now - timedelta(days=7)

    stmt = (
        select(Expense)
        .where(
            Expense.user_id == user.id,
            Expense.spent_at >= week_start,
            Expense.spent_at <= now,
        )
        .options(selectinload(Expense.category))
    )
    week_exp = list((await db.scalars(stmt)).all())

    week_total = sum((e.amount for e in week_exp), Decimal(0))
    sums: dict[int, Decimal] = {}
    names: dict[int, str] = {}
    for e in week_exp:
        sums[e.category_id] = sums.get(e.category_id, Decimal(0)) + e.amount
        names[e.category_id] = e.category.name

    top_category = None
    top_amount = Decimal(0)
    if sums:
        cid = max(sums, key=lambda k: sums[k])
        top_category, top_amount = names[cid], sums[cid]

    progress = await budget_service.get_progress(db, user)
    ov = progress.overall

    return WeeklyStats(
        week_total=week_total,
        week_count=len(week_exp),
        top_category=top_category,
        top_category_amount=top_amount,
        month_label=progress.month_label,
        month_spent=ov.spent,
        month_budget=ov.budget,
        month_remaining=ov.remaining,
        month_pct=ov.pct,
        safe_per_day=ov.safe_per_day,
        days_left=progress.days_left,
    )


async def send_weekly_recaps(db: AsyncSession) -> dict:
    """Email a recap to every user active in the last 7 days. Best-effort."""
    now = now_utc()
    week_start = now - timedelta(days=7)

    active_ids = (
        await db.scalars(
            select(Expense.user_id).where(Expense.spent_at >= week_start).distinct()
        )
    ).all()
    if not active_ids:
        return {"eligible": 0, "sent": 0}

    users = list(
        (await db.scalars(select(User).where(User.id.in_(active_ids)))).all()
    )

    sent = 0
    for user in users:
        stats = await build_weekly_stats(db, user)
        if await send_weekly_recap_email(user.email, user.display_name, stats):
            sent += 1
    return {"eligible": len(users), "sent": sent}
