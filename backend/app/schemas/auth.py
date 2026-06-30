from __future__ import annotations

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

PIN_PATTERN = re.compile(r"^\d{6}$")
PHONE_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")


def _validate_pin(value: str) -> str:
    if not PIN_PATTERN.match(value):
        raise ValueError("PIN must be exactly 6 digits.")
    return value


class SignupRequest(BaseModel):
    email: EmailStr
    phone: str | None = Field(default=None)
    pin: str = Field(min_length=6, max_length=6)
    display_name: str | None = Field(default=None, max_length=120)

    @field_validator("pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        v = v.strip().replace(" ", "")
        if not PHONE_PATTERN.match(v):
            raise ValueError("Please enter a valid phone number.")
        return v


class LoginRequest(BaseModel):
    # Either an email address or a phone number.
    identifier: str = Field(min_length=3, max_length=255)
    pin: str = Field(min_length=6, max_length=6)

    @field_validator("pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)


class ChangePinRequest(BaseModel):
    current_pin: str = Field(min_length=6, max_length=6)
    new_pin: str = Field(min_length=6, max_length=6)

    @field_validator("new_pin")
    @classmethod
    def check_pin(cls, v: str) -> str:
        return _validate_pin(v)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
