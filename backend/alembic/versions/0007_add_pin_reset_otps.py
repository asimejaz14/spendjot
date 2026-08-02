"""add pin_reset_otps table

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-12

Additive-only: creates the `pin_reset_otps` table for the forgot-PIN email OTP
flow. Nothing existing is altered, so rolling the code back stays safe.
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pin_reset_otps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pin_reset_otps_user_id", "pin_reset_otps", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_pin_reset_otps_user_id", table_name="pin_reset_otps")
    op.drop_table("pin_reset_otps")
