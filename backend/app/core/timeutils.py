"""UTC-normalized datetime helpers.

Rule of thumb: every datetime that touches the DB is timezone-aware UTC. When a
value comes back naive (e.g. from SQLite in tests) we treat it as UTC. This keeps
date filtering correct and identical across Postgres and SQLite.
"""
from __future__ import annotations

from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def month_start(dt: datetime) -> datetime:
    dt = as_utc(dt)
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def add_months(dt: datetime, months: int) -> datetime:
    """Shift to the first day of the month `months` away from `dt`'s month."""
    base = month_start(dt)
    total = (base.year * 12 + (base.month - 1)) + months
    year, month = divmod(total, 12)
    return base.replace(year=year, month=month + 1)


MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
MONTH_ABBR = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
