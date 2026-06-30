"""Seed categories, a demo user, and ~3 months of realistic mock expenses.

Run with:  python -m app.seed
Idempotent: it upserts categories and only creates the demo user/data once.

Demo login →  email: demo@spendjot.app   |   PIN: 123456
"""
from __future__ import annotations

import asyncio
import random
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.categories import SEED_CATEGORIES
from app.core.security import hash_pin
from app.core.timeutils import add_months, month_start, now_utc
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.category import Category
from app.models.expense import Expense
from app.models.user import User

DEMO_EMAIL = "demo@spendjot.app"
DEMO_PHONE = "+923001234567"
DEMO_PIN = "123456"

# Realistic PKR sample expenses per category (name, [min, max] amount).
SAMPLES: dict[str, list[tuple[str, int, int]]] = {
    "food": [
        ("Lunch at Kolachi", 1200, 3500),
        ("Grocery run", 2500, 8000),
        ("Coffee", 450, 900),
        ("Dinner with friends", 2000, 6000),
        ("Breakfast", 350, 700),
    ],
    "utility": [
        ("Electricity bill", 6000, 18000),
        ("Internet bill", 3500, 5000),
        ("Gas bill", 1500, 4000),
        ("Mobile top-up", 500, 2000),
        ("Water bill", 800, 1500),
    ],
    "shisha": [
        ("Shisha lounge", 1500, 3000),
        ("Flavour pack", 600, 1200),
    ],
    "entertainment": [
        ("Cinema tickets", 1500, 3000),
        ("Netflix", 1100, 1100),
        ("Concert", 4000, 12000),
        ("Game purchase", 2500, 6000),
    ],
    "travel": [
        ("Careem ride", 400, 1500),
        ("Fuel", 3000, 8000),
        ("Intercity bus", 1800, 4000),
        ("Airport pickup", 1200, 2500),
    ],
    "misc": [
        ("Pharmacy", 600, 2500),
        ("Gift", 2000, 7000),
        ("Stationery", 300, 1200),
        ("Haircut", 800, 2000),
    ],
}


async def upsert_categories(session) -> dict[str, int]:
    slug_to_id: dict[str, int] = {}
    for row in SEED_CATEGORIES:
        existing = await session.scalar(select(Category).where(Category.slug == row["slug"]))
        if existing:
            existing.name = row["name"]
            existing.icon = row["icon"]
            existing.sort_order = row["sort_order"]
            existing.is_active = True
            slug_to_id[row["slug"]] = existing.id
        else:
            cat = Category(
                id=row["id"],
                slug=row["slug"],
                name=row["name"],
                icon=row["icon"],
                sort_order=row["sort_order"],
                is_active=True,
            )
            session.add(cat)
            await session.flush()
            slug_to_id[row["slug"]] = cat.id
    return slug_to_id


async def seed_demo_expenses(session, user: User, slug_to_id: dict[str, int]) -> int:
    rng = random.Random(42)  # deterministic
    start = add_months(month_start(now_utc()), -2)  # beginning of 2 months ago
    created = 0
    # Spread ~6-10 expenses across each of the last 3 months.
    for month_offset in range(3):
        m_start = add_months(start, month_offset)
        n = rng.randint(14, 22)
        for _ in range(n):
            slug = rng.choice(list(SAMPLES.keys()))
            name, lo, hi = rng.choice(SAMPLES[slug])
            amount = Decimal(rng.randint(lo, hi))
            day = rng.randint(0, 27)
            hour = rng.randint(8, 22)
            spent_at = m_start + timedelta(days=day, hours=hour, minutes=rng.randint(0, 59))
            session.add(
                Expense(
                    user_id=user.id,
                    category_id=slug_to_id[slug],
                    name=name,
                    amount=amount,
                    spent_at=spent_at,
                    description=None,
                )
            )
            created += 1
    await session.flush()
    return created


async def run() -> None:
    # Create tables if they don't exist (handy for local/dev; production uses Alembic).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        slug_to_id = await upsert_categories(session)

        user = await session.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            user = User(
                email=DEMO_EMAIL,
                phone=DEMO_PHONE,
                pin_hash=hash_pin(DEMO_PIN),
                display_name="Asim (Demo)",
                currency="PKR",
                theme="system",
            )
            session.add(user)
            await session.flush()
            count = await seed_demo_expenses(session, user, slug_to_id)
            print(f"Created demo user {DEMO_EMAIL} with {count} expenses.")
        else:
            # Refresh expenses so re-seeding gives a clean, current dataset.
            await session.execute(delete(Expense).where(Expense.user_id == user.id))
            count = await seed_demo_expenses(session, user, slug_to_id)
            print(f"Demo user already existed; reseeded {count} expenses.")

        await session.commit()

    print("Seed complete.  Login ->  email: demo@spendjot.app   PIN: 123456")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
