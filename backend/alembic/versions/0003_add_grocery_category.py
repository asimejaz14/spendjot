"""add grocery category

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-02
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: skip if the slug already exists (e.g. added directly in the DB).
    op.execute(
        """
        INSERT INTO categories (id, slug, name, icon, sort_order, is_active)
        VALUES (7, 'grocery', 'Grocery', 'grocery', 15, true)
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug = 'grocery'")
