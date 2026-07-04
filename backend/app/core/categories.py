"""Canonical, hardcoded category list. Edit here (and re-seed) or add rows
directly in the database. The `icon` keys map to the frontend CategoryIcon component."""
from __future__ import annotations

SEED_CATEGORIES: list[dict] = [
    {"id": 1, "slug": "food", "name": "Food/Dine out", "icon": "food", "sort_order": 10},
    {"id": 7, "slug": "grocery", "name": "Grocery", "icon": "grocery", "sort_order": 15},
    {"id": 2, "slug": "utility", "name": "Utility Bill", "icon": "utility", "sort_order": 20},
    {"id": 8, "slug": "medical", "name": "Medical", "icon": "medical", "sort_order": 25},
    {"id": 3, "slug": "shisha", "name": "Shisha", "icon": "shisha", "sort_order": 30},
    {"id": 4, "slug": "entertainment", "name": "Entertainment", "icon": "entertainment", "sort_order": 40},
    {"id": 5, "slug": "travel", "name": "Travel", "icon": "travel", "sort_order": 50},
    {"id": 6, "slug": "misc", "name": "Miscellaneous", "icon": "misc", "sort_order": 60},
]
