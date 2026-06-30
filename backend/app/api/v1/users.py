from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(tags=["profile"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate, db: DbSession, current_user: CurrentUser
) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    if "display_name" in data:
        current_user.display_name = data["display_name"] or None
    if "theme" in data and data["theme"]:
        current_user.theme = data["theme"]
    if "currency" in data and data["currency"]:
        current_user.currency = data["currency"]
    await db.flush()
    return UserOut.model_validate(current_user)
