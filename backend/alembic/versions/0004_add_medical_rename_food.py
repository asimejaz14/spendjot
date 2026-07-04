"""add medical category; rename food to Food/Dine out

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-04
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New "Medical" category (idempotent on slug).
    op.execute(
        """
        INSERT INTO categories (id, slug, name, icon, sort_order, is_active)
        VALUES (8, 'medical', 'Medical', 'medical', 25, true)
        ON CONFLICT (slug) DO NOTHING
        """
    )
    # Rename Food -> "Food/Dine out" (slug/icon unchanged).
    op.execute("UPDATE categories SET name = 'Food/Dine out' WHERE slug = 'food'")


def downgrade() -> None:
    op.execute("UPDATE categories SET name = 'Food' WHERE slug = 'food'")
    op.execute("DELETE FROM categories WHERE slug = 'medical'")
