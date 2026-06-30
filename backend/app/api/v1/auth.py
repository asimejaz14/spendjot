from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.rate_limit import login_rate_limit, signup_rate_limit
from app.core.security import create_access_token
from app.schemas.auth import (
    ChangePinRequest,
    LoginRequest,
    SignupRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services import auth_service
from app.services.email_service import send_welcome_email

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "spendjot_refresh"


def _cookie_path() -> str:
    return f"{settings.api_prefix}/auth"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=_cookie_path(),
        max_age=settings.refresh_token_expire_days * 24 * 3600,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=_cookie_path())


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(signup_rate_limit)],
)
async def signup(
    payload: SignupRequest,
    db: DbSession,
    response: Response,
    background_tasks: BackgroundTasks,
) -> TokenResponse:
    user = await auth_service.signup(db, payload)
    refresh = await auth_service.issue_refresh_token(db, user)
    _set_refresh_cookie(response, refresh)
    # Best-effort welcome email — runs after the response, never blocks signup.
    background_tasks.add_task(send_welcome_email, user.email, user.display_name)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(login_rate_limit)],
)
async def login(
    payload: LoginRequest, db: DbSession, response: Response
) -> TokenResponse:
    user = await auth_service.authenticate(db, payload)
    refresh = await auth_service.issue_refresh_token(db, user)
    _set_refresh_cookie(response, refresh)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    db: DbSession,
    response: Response,
    spendjot_refresh: str | None = Cookie(default=None),
) -> TokenResponse:
    user, new_refresh = await auth_service.rotate_refresh_token(db, spendjot_refresh or "")
    _set_refresh_cookie(response, new_refresh)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    db: DbSession,
    response: Response,
    spendjot_refresh: str | None = Cookie(default=None),
) -> Response:
    await auth_service.revoke_refresh_token(db, spendjot_refresh)
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/change-pin", status_code=status.HTTP_204_NO_CONTENT)
async def change_pin(
    payload: ChangePinRequest, db: DbSession, current_user: CurrentUser
) -> Response:
    await auth_service.change_pin(
        db, current_user, payload.current_pin, payload.new_pin
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
