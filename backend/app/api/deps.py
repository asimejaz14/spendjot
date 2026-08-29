"""Shared FastAPI dependencies."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.core.security import API_TOKEN_PREFIX, decode_access_token, hash_api_token
from app.core.timeutils import now_utc
from app.db.session import get_db
from app.models.api_token import ApiToken
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


async def get_current_user_or_token(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """Like ``get_current_user`` but also accepts a personal API token
    (``sj_live_…``). Only endpoints that opt into this dependency accept tokens,
    which keeps a leaked voice token from reaching the rest of the account.
    """
    not_authed = AppError(
        "Please sign in to continue.", code="not_authenticated", status_code=401
    )
    if credentials is None or not credentials.credentials:
        raise not_authed

    raw = credentials.credentials
    if raw.startswith(API_TOKEN_PREFIX):
        token = (
            await db.scalars(
                select(ApiToken).where(
                    ApiToken.token_hash == hash_api_token(raw),
                    ApiToken.revoked_at.is_(None),
                )
            )
        ).first()
        if token is None:
            raise AppError(
                "This access token is invalid or has been revoked.",
                code="invalid_token",
                status_code=401,
            )
        user = await db.get(User, token.user_id)
        if user is None:
            raise not_authed
        token.last_used_at = now_utc()
        await db.commit()
        return user

    # Otherwise fall back to the normal JWT access-token path.
    payload = decode_access_token(raw)
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


CurrentUserOrToken = Annotated[User, Depends(get_current_user_or_token)]
