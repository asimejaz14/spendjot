"""seed hardcoded categories

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-29
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CATEGORIES = [
    (1, "food", "Food", "food", 10),
    (2, "utility", "Utility Bill", "utility", 20),
    (3, "shisha", "Shisha", "shisha", 30),
    (4, "entertainment", "Entertainment", "entertainment", 40),
    (5, "travel", "Travel", "travel", 50),
    (6, "misc", "Miscellaneous", "misc", 60),
]


def upgrade() -> None:
    categories = sa.table(
        "categories",
        sa.column("id", sa.Integer),
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        sa.column("icon", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        categories,
        [
            {"id": i, "slug": slug, "name": name, "icon": icon, "sort_order": order, "is_active": True}
            for (i, slug, name, icon, order) in CATEGORIES
        ],
    )


def downgrade() -> None:
    slugs = ", ".join(f"'{c[1]}'" for c in CATEGORIES)
    op.execute(f"DELETE FROM categories WHERE slug IN ({slugs})")
