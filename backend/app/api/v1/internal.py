"""Internal, machine-triggered endpoints (cron jobs).

Guarded by a shared secret (`CRON_SECRET`) rather than a user session. When the
secret is unset the endpoints 404, so they're inert until explicitly enabled.
"""
from __future__ import annotations

from fastapi import APIRouter, Header
from pydantic import BaseModel, EmailStr

from app.api.deps import DbSession
from app.core.config import settings
from app.core.exceptions import AppError
from app.services import announcement_service, recap_service

router = APIRouter(prefix="/internal", tags=["internal"])


def _require_cron_secret(provided: str | None) -> None:
    if not settings.cron_secret:
        raise AppError("Not found.", code="not_found", status_code=404)
    if provided != settings.cron_secret:
        raise AppError("Not authorized.", code="forbidden", status_code=403)


@router.post("/weekly-recap")
async def trigger_weekly_recap(
    db: DbSession,
    x_cron_secret: str | None = Header(default=None),
) -> dict:
    _require_cron_secret(x_cron_secret)
    return await recap_service.send_weekly_recaps(db)


class AnnounceRequest(BaseModel):
    """`test_to` sends a single copy (do this first); `confirm_all` sends to everyone."""

    test_to: EmailStr | None = None
    confirm_all: bool = False


@router.post("/announce/whats-new")
async def announce_whats_new(
    payload: AnnounceRequest,
    db: DbSession,
    x_cron_secret: str | None = Header(default=None),
) -> dict:
    _require_cron_secret(x_cron_secret)
    if payload.test_to:
        return await announcement_service.send_whats_new(db, test_to=str(payload.test_to))
    if not payload.confirm_all:
        raise AppError(
            "Pass test_to for a test send, or confirm_all=true to email every user.",
            code="confirmation_required",
        )
    return await announcement_service.send_whats_new(db)
