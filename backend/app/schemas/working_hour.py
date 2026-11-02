"""Validation and response models for work-hour entries."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkingHourCreate(BaseModel):
    house_id: int
    date: date
    start: time
    end: time
    break_minutes: int = Field(default=0, ge=0, le=1440)
    service: Literal[
        "standardClean",
        "deepClean",
        "checkIn",
        "checkOut",
        "bedLinen",
        "laundry",
        # Retain support for existing entries created with the previous options.
        "al",
        "house",
        "postConstruction",
        "textile",
    ]
    task: str = Field(default="", max_length=280)
    rate: Decimal = Field(ge=1, le=1000, decimal_places=2)

    @model_validator(mode="after")
    def validate_time_range(self) -> "WorkingHourCreate":
        if self.end <= self.start:
            raise ValueError("Finish time must be later than start time")
        duration_minutes = int((datetime.combine(self.date, self.end) - datetime.combine(self.date, self.start)).total_seconds() // 60)
        if self.break_minutes >= duration_minutes:
            raise ValueError("Break must be shorter than the working period")
        return self


class WorkingHourUpdate(WorkingHourCreate):
    """Editable work-hour fields for an existing employee entry."""

    task: Optional[str] = Field(default=None, max_length=280)


class WorkingHourRead(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: Optional[str]
    calendar_color: str
    house_id: int
    house_name: str
    date: date
    start: str
    end: str
    break_minutes: int = 0
    service: str
    task: str
    rate: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkingHourHistoryRead(BaseModel):
    id: int
    working_hour_id: int
    actor_id: int
    actor_username: str
    action: Literal["updated", "deleted", "restored"]
    changed_at: datetime
    before_state: Optional[dict[str, object]]
    after_state: Optional[dict[str, object]]

    model_config = ConfigDict(from_attributes=True)
