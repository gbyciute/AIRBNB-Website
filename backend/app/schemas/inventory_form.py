"""Schemas for inventory tracking sheets."""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


OperationType = Literal["check_in", "check_out", "laundry"]
InventoryCategory = Literal["bed_linen", "bath_linen", "kitchen_cleaning", "decorative_textiles"]


class InventoryFormLineInput(BaseModel):
    category: InventoryCategory
    description: str = Field(min_length=1, max_length=255)
    stock_total: Optional[int] = Field(default=None, ge=0)
    current_quantity: Optional[int] = Field(default=None, ge=0)
    outgoing_laundry: Optional[int] = Field(default=None, ge=0)
    incoming_clean: Optional[int] = Field(default=None, ge=0)
    status_observations: str = Field(default="", max_length=4000)

    @field_validator("description")
    @classmethod
    def description_cannot_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Item description must not be blank")
        return value


class InventoryFormLineRead(InventoryFormLineInput):
    id: int
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class InventoryFormCreate(BaseModel):
    count_date: date
    operation_types: list[OperationType] = Field(default_factory=list)
    room_division: str = Field(default="", max_length=255)
    responsible: str = Field(default="", max_length=255)
    counter_name: str = Field(default="", max_length=255)
    responsible_signature: str = Field(default="", max_length=255)
    checked_by: str = Field(default="", max_length=255)
    lines: list[InventoryFormLineInput] = Field(default_factory=list)


class InventoryFormUpdate(InventoryFormCreate):
    pass


class InventoryFormRead(InventoryFormCreate):
    id: int
    house_id: int
    created_at: datetime
    updated_at: datetime
    created_by_username: Optional[str] = None
    last_edited_by_username: Optional[str] = None
    lines: list[InventoryFormLineRead]

    model_config = ConfigDict(from_attributes=True)
