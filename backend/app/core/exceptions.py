"""Application errors and handlers that return friendly, human-readable messages.

Every error response shares the shape::

    {"error": {"code": "some_code", "message": "Readable sentence."}}

so the frontend can show ``error.message`` directly to users.
"""
from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """Raised throughout the app for expected, user-facing failures."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "error",
        status_code: int = status.HTTP_400_BAD_REQUEST,
    ) -> None:
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


def _payload(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


# Map common validation field issues to friendlier sentences.
def _friendly_validation(errors: list[dict]) -> str:
    if not errors:
        return "Some of the information you entered isn't valid. Please check and try again."
    first = errors[0]
    field = first.get("loc", ["field"])[-1]
    field_label = str(field).replace("_", " ")
    msg = first.get("msg", "")
    if "email" in str(field).lower():
        return "Please enter a valid email address."
    if "value_error.missing" in first.get("type", "") or msg == "Field required":
        return f"Please provide your {field_label}."
    return f"The {field_label} you entered isn't valid. Please check and try again."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code, content=_payload(exc.code, exc.message)
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_payload("validation_error", _friendly_validation(exc.errors())),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        # Detail may already be a friendly string we set ourselves.
        message = exc.detail if isinstance(exc.detail, str) else "Something went wrong."
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            message = message or "We couldn't find what you were looking for."
        return JSONResponse(
            status_code=exc.status_code,
            content=_payload("http_error", message),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_payload(
                "server_error",
                "Something went wrong on our end. Please try again in a moment.",
            ),
        )
