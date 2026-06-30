from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    phone: str | None
    display_name: str | None
    theme: str
    currency: str


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    theme: Literal["light", "dark", "system"] | None = None
    currency: str | None = Field(default=None, max_length=8)
