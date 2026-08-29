from __future__ import annotations

import uuid

from fastapi import APIRouter, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import AppError
from app.core.security import generate_api_token, hash_api_token
from app.models.api_token import ApiToken
from app.schemas.api_token import ApiTokenCreate, ApiTokenCreated, ApiTokenOut

router = APIRouter(prefix="/tokens", tags=["tokens"])

# A sane ceiling so a user can't mint unbounded tokens.
_MAX_ACTIVE_TOKENS = 10


@router.get("", response_model=list[ApiTokenOut])
async def list_tokens(db: DbSession, current_user: CurrentUser) -> list[ApiToken]:
    rows = (
        await db.scalars(
            select(ApiToken)
            .where(ApiToken.user_id == current_user.id, ApiToken.revoked_at.is_(None))
            .order_by(ApiToken.created_at.desc())
        )
    ).all()
    return list(rows)


@router.post("", response_model=ApiTokenCreated, status_code=status.HTTP_201_CREATED)
async def create_token(
    payload: ApiTokenCreate, db: DbSession, current_user: CurrentUser
) -> ApiTokenCreated:
    active = (
        await db.scalars(
            select(ApiToken).where(
                ApiToken.user_id == current_user.id, ApiToken.revoked_at.is_(None)
            )
        )
    ).all()
    if len(active) >= _MAX_ACTIVE_TOKENS:
        raise AppError(
            "You've reached the maximum number of access tokens. Revoke one first.",
            code="too_many_tokens",
            status_code=409,
        )

    plaintext = generate_api_token()
    token = ApiToken(
        user_id=current_user.id,
        name=payload.name.strip() or "Siri Shortcut",
        token_hash=hash_api_token(plaintext),
        prefix=plaintext[:12],  # "sj_live_xxxx"
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)

    return ApiTokenCreated(
        id=token.id,
        name=token.name,
        prefix=token.prefix,
        last_used_at=token.last_used_at,
        created_at=token.created_at,
        token=plaintext,  # shown exactly once
    )


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_token(
    token_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> Response:
    token = await db.get(ApiToken, token_id)
    if token is None or token.user_id != current_user.id or token.revoked_at is not None:
        raise AppError("Token not found.", code="not_found", status_code=404)
    from app.core.timeutils import now_utc

    token.revoked_at = now_utc()
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
