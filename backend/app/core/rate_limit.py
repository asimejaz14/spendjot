"""Lightweight per-IP rate limiting, used as a FastAPI dependency.

This is a best-effort, in-process sliding-window limiter (not shared across
workers). It complements the authoritative per-account lockout in the DB. Used
on auth endpoints to blunt signup spam and distributed PIN guessing.

Implemented as a closure factory (rather than a callable class) so FastAPI
introspects the dependency signature cleanly and injects ``Request``.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import AppError

RateDependency = Callable[[Request], Awaitable[None]]


def rate_limiter(times: int, seconds: int) -> RateDependency:
    hits: dict[str, deque[float]] = defaultdict(deque)

    async def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        client = request.client
        ip = client.host if client else "anonymous"
        key = f"{request.url.path}:{ip}"
        now = time.monotonic()
        window = hits[key]
        cutoff = now - seconds
        while window and window[0] <= cutoff:
            window.popleft()
        if len(window) >= times:
            raise AppError(
                "You're doing that too often. Please wait a moment and try again.",
                code="rate_limited",
                status_code=429,
            )
        window.append(now)

    return dependency


login_rate_limit: RateDependency = rate_limiter(times=20, seconds=60)
signup_rate_limit: RateDependency = rate_limiter(times=10, seconds=60)
