from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid


class Budget(Base, TimestampMixin):
    """A user's monthly spending limit.

    ``category_id`` NULL means the overall monthly budget; a non-NULL value is a
    per-category limit. One row per (user, category); the service also enforces a
    single overall row per user (NULLs don't collide in the unique constraint).
    """

    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("user_id", "category_id", name="uq_budgets_user_category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    category: Mapped["Category"] = relationship()  # noqa: F821
