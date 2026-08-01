"""add bike/car maintenance and pets categories

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-06
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent on slug (safe if a row was added directly in the DB).
    op.execute(
        """
        INSERT INTO categories (id, slug, name, icon, sort_order, is_active)
        VALUES
            (9, 'maintenance', 'Bike/Car Maintenance', 'maintenance', 45, true),
            (10, 'pets', 'Pets', 'pets', 55, true)
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM categories WHERE slug IN ('maintenance', 'pets')")
