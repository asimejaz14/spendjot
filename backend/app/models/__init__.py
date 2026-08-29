"""Import all models so they register on the shared metadata."""
from app.models.api_token import ApiToken
from app.models.budget import Budget
from app.models.category import Category
from app.models.expense import Expense
from app.models.pin_reset_otp import PinResetOtp
from app.models.refresh_token import RefreshToken
from app.models.user import User

__all__ = [
    "User",
    "Category",
    "Expense",
    "RefreshToken",
    "Budget",
    "PinResetOtp",
    "ApiToken",
]
