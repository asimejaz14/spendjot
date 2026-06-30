"""Shared FastAPI dependencies."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

# auto_error=False so we can raise our own friendly error.
bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    not_authed = AppError(
        "Please sign in to continue.", code="not_authenticated", status_code=401
    )
    if credentials is None or not credentials.credentials:
        raise not_authed

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise AppError(
            "Your session has expired. Please sign in again.",
            code="invalid_token",
            status_code=401,
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise not_authed

    user = await db.get(User, user_id)
    if user is None:
        raise not_authed
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
