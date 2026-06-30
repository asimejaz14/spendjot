from __future__ import annotations

import os

# Disable per-IP rate limiting before app/settings import so the suite (which
# creates many users quickly) isn't throttled.
os.environ["RATE_LIMIT_ENABLED"] = "false"

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.categories import SEED_CATEGORIES
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.category import Category

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture(scope="session")
async def sessionmaker_(engine):
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def _reset_db(engine, sessionmaker_):
    """Clean the DB between tests and re-seed categories."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with sessionmaker_() as s:
        for row in SEED_CATEGORIES:
            s.add(Category(**row, is_active=True))
        await s.commit()


@pytest_asyncio.fixture
async def client(sessionmaker_) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        async with sessionmaker_() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient) -> AsyncGenerator[AsyncClient, None]:
    """A client already signed up + authenticated as a demo user."""
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "asim@example.com", "phone": "+923001112233", "pin": "123456"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
