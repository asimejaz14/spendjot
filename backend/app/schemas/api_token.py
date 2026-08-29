from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiTokenCreate(BaseModel):
    name: str = Field(default="Siri Shortcut", min_length=1, max_length=60)


class ApiTokenOut(BaseModel):
    """Safe representation for listing — never includes the secret."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    prefix: str
    last_used_at: datetime | None
    created_at: datetime


class ApiTokenCreated(ApiTokenOut):
    """Returned only at creation — carries the plaintext token exactly once."""

    token: str
