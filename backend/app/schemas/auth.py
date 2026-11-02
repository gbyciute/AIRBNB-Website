"""Request and response schemas for login and user administration."""

from __future__ import annotations

import re

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Username must not be blank")
        return normalized


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=256)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9_.-]{3,64}", normalized):
            raise ValueError("Use 3–64 letters, numbers, dots, underscores, or hyphens")
        return normalized


class UserRead(BaseModel):
    id: int
    username: str
    is_admin: bool
    is_active: bool
    display_name: Optional[str] = None
    calendar_color: str = "emerald"

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    display_name: str = Field(max_length=64)
    calendar_color: Literal["emerald", "blue", "violet", "amber", "rose", "teal"]

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, value: str) -> str:
        return value.strip()
