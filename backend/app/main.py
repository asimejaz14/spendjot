from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Spend Jot — jot expenses in seconds.",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Accept HEAD as well as GET: many uptime monitors (UptimeRobot, etc.) default to
# HEAD, and FastAPI's @app.get would otherwise 405 those probes.
@app.api_route("/health", methods=["GET", "HEAD"], tags=["meta"])
async def health() -> dict:
    return {"status": "ok"}


app.include_router(api_router, prefix=settings.api_prefix)
