from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryOut
from app.schemas.common import Money


class ExpenseBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category_id: int
    description: str | None = Field(default=None, max_length=2000)
    spent_at: datetime | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    category_id: int | None = None
    description: str | None = Field(default=None, max_length=2000)
    spent_at: datetime | None = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    amount: Money
    description: str | None
    spent_at: datetime
    category: CategoryOut
    created_at: datetime


class ExpenseListOut(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int
    total_amount: Money


class ParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)


class ParsedExpenseOut(BaseModel):
    """A draft parsed from natural language — for the user to review, not saved."""

    name: str
    amount: Money | None
    category_id: int | None
    category_name: str | None
    spent_at: datetime
