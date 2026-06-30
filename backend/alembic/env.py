from __future__ import annotations

import asyncio
import ssl
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool

from app.core.config import settings
from app.db.base import Base
import app.models  # noqa: F401  (register all models on the metadata)


def _connect_args() -> dict:
    """Mirror app.db.session so migrations connect through poolers/TLS the same way."""
    args: dict = {}
    if settings.database_url.startswith("postgresql+asyncpg"):
        args["statement_cache_size"] = 0
        if settings.db_ssl:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            args["ssl"] = ctx
    return args

config = context.config
# NOTE: do NOT push the URL through config.set_main_option / the .ini — a URL-
# encoded password (e.g. %3D) trips ConfigParser's %-interpolation. We read
# settings.database_url directly when building the engine instead.

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection, target_metadata=target_metadata, compare_type=True
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = create_async_engine(
        settings.database_url,
        poolclass=pool.NullPool,
        connect_args=_connect_args(),
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
