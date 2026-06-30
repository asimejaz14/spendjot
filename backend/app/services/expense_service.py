"""Expense CRUD + filtered listing, all scoped to a single user."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AppError
from app.core.timeutils import as_utc, now_utc
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


async def _ensure_category(db: AsyncSession, category_id: int) -> Category:
    category = await db.get(Category, category_id)
    if category is None or not category.is_active:
        raise AppError(
            "Please choose a valid category.", code="invalid_category", status_code=400
        )
    return category


async def create_expense(db: AsyncSession, user: User, data: ExpenseCreate) -> Expense:
    await _ensure_category(db, data.category_id)
    expense = Expense(
        user_id=user.id,
        category_id=data.category_id,
        name=data.name.strip(),
        amount=data.amount,
        description=(data.description or None),
        spent_at=as_utc(data.spent_at) if data.spent_at else now_utc(),
    )
    db.add(expense)
    await db.flush()
    return await get_expense(db, user, expense.id)


async def get_expense(db: AsyncSession, user: User, expense_id: uuid.UUID) -> Expense:
    stmt = (
        select(Expense)
        .where(Expense.id == expense_id, Expense.user_id == user.id)
        .options(selectinload(Expense.category))
    )
    expense = await db.scalar(stmt)
    if expense is None:
        raise AppError(
            "We couldn't find that expense.", code="not_found", status_code=404
        )
    return expense


async def update_expense(
    db: AsyncSession, user: User, expense_id: uuid.UUID, data: ExpenseUpdate
) -> Expense:
    expense = await get_expense(db, user, expense_id)
    if data.category_id is not None:
        category = await _ensure_category(db, data.category_id)
        expense.category = category
    if data.name is not None:
        expense.name = data.name.strip()
    if data.amount is not None:
        expense.amount = data.amount
    if data.description is not None:
        expense.description = data.description or None
    if data.spent_at is not None:
        expense.spent_at = as_utc(data.spent_at)
    await db.flush()
    return await get_expense(db, user, expense.id)


async def delete_expense(db: AsyncSession, user: User, expense_id: uuid.UUID) -> None:
    expense = await get_expense(db, user, expense_id)
    await db.delete(expense)
    await db.flush()


async def list_expenses(
    db: AsyncSession,
    user: User,
    *,
    start: datetime | None = None,
    end: datetime | None = None,
    category_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Expense], int, Decimal]:
    filters = [Expense.user_id == user.id]
    if start is not None:
        filters.append(Expense.spent_at >= start)
    if end is not None:
        filters.append(Expense.spent_at <= end)
    if category_id is not None:
        filters.append(Expense.category_id == category_id)
    if search:
        like = f"%{search.strip()}%"
        filters.append(Expense.name.ilike(like))

    total = await db.scalar(
        select(func.count()).select_from(Expense).where(*filters)
    ) or 0
    total_amount = await db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*filters)
    ) or Decimal(0)

    stmt = (
        select(Expense)
        .where(*filters)
        .options(selectinload(Expense.category))
        .order_by(Expense.spent_at.desc(), Expense.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list((await db.scalars(stmt)).all())
    return items, int(total), Decimal(total_amount)
