from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, categories, dashboard, expenses, users

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(categories.router)
api_router.include_router(expenses.router)
api_router.include_router(dashboard.router)
