"""Async engine + session factory."""
from __future__ import annotations

import ssl
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# When connecting through a connection pooler (e.g. Supabase Supavisor / PgBouncer),
# server-side prepared statements must be disabled or asyncpg errors on reused
# connections. statement_cache_size=0 makes us compatible with session AND
# transaction pooler modes, at a negligible cost for this workload.
connect_args: dict = {}
if settings.database_url.startswith("postgresql+asyncpg"):
    connect_args["statement_cache_size"] = 0
    if settings.db_ssl:
        # sslmode=require: encrypt the connection but skip CA verification —
        # Supabase's pooler presents a cert from its own (non-public) CA.
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    future=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a session, committing on success."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
