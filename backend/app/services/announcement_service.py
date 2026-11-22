"""One-off product announcements emailed to users ("What's new").

Triggered manually through the cron-secret-protected internal endpoint (see
.github/workflows/announce-whats-new.yml). Always do a `test_to` send to
yourself first — the "all" send has no undo.
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.services.email_service import send_whats_new_email

logger = logging.getLogger("spendjot.announce")

# Resend's default limit is 2 requests/second; stay comfortably under it.
SEND_INTERVAL_SECONDS = 0.6


async def send_whats_new(db: AsyncSession, *, test_to: str | None = None) -> dict:
    """Email the announcement to every user, or only to `test_to` when given."""
    if test_to:
        user = await db.scalar(select(User).where(func.lower(User.email) == test_to.lower()))
        ok = await send_whats_new_email(test_to, user.display_name if user else None)
        return {"mode": "test", "eligible": 1, "sent": int(ok), "failed": int(not ok)}

    users = list((await db.scalars(select(User).order_by(User.created_at))).all())
    sent = failed = 0
    for i, user in enumerate(users):
        if i:
            await asyncio.sleep(SEND_INTERVAL_SECONDS)
        if await send_whats_new_email(user.email, user.display_name):
            sent += 1
        else:
            failed += 1
    logger.info("What's-new announcement: eligible=%d sent=%d failed=%d", len(users), sent, failed)
    return {"mode": "all", "eligible": len(users), "sent": sent, "failed": failed}
