from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, new_uuid, utcnow


class ApiToken(Base):
    """A long-lived personal access token — used by the Siri/Shortcuts voice
    flow so it doesn't have to hold the user's PIN or a short-lived JWT.

    Only the SHA-256 hash is stored; the plaintext (``sj_live_…``) is shown to
    the user exactly once at creation. Tokens are revocable and scoped: the auth
    dependency only accepts them on the endpoints that opt in (currently the
    voice endpoint), so a leaked token can create expenses but not touch the
    rest of the account.
    """

    __tablename__ = "api_tokens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=new_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    # SHA-256 hex of the plaintext token.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    # First few chars of the token (e.g. "sj_live_ab12"), for display only.
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
