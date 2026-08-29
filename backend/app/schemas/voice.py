from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.expense import ExpenseOut


class VoiceExpenseRequest(BaseModel):
    """What the Shortcut sends: the dictated phrase plus the device's clock so
    relative dates ("yesterday", "this morning") resolve in the user's timezone.
    """

    text: str = Field(min_length=1, max_length=400)
    # Device local time at capture (ISO 8601). Used to anchor relative dates.
    client_now: datetime | None = None
    # IANA timezone name, e.g. "Asia/Karachi". Optional; falls back to UTC.
    client_tz: str | None = Field(default=None, max_length=64)


class VoiceExpenseResponse(BaseModel):
    """Always 200 so Siri can speak the result. `saved` says whether a record
    was created; `spoken` is the exact line for Siri to read back."""

    saved: bool
    spoken: str
    expense: ExpenseOut | None = None
