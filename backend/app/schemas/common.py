"""Shared schema types."""
from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from pydantic import PlainSerializer

# Monetary output: always rendered as a fixed 2-decimal string in JSON
# (e.g. "2000.00"), independent of how the DB returns the Decimal. The Python
# value remains a Decimal for any server-side math.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda v: f"{Decimal(v):.2f}", return_type=str, when_used="json"),
]
