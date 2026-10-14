"""Inventory tracking sheets and their editable item rows."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class InventoryForm(Base):
    __tablename__ = "inventory_forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("houses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    last_edited_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    last_edited_by_username_snapshot: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    count_date: Mapped[date] = mapped_column(Date, nullable=False)
    operation_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    room_division: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    responsible: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    counter_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    responsible_signature: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    checked_by: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    house: Mapped[House] = relationship(back_populates="inventory_forms")
    created_by: Mapped[Optional[User]] = relationship(foreign_keys=[created_by_user_id])
    last_edited_by: Mapped[Optional[User]] = relationship(foreign_keys=[last_edited_by_user_id])
    lines: Mapped[list[InventoryFormLine]] = relationship(
        back_populates="inventory_form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="InventoryFormLine.sort_order",
    )

    @property
    def created_by_username(self) -> Optional[str]:
        return self.created_by.username if self.created_by else None

    @property
    def last_edited_by_username(self) -> Optional[str]:
        return self.last_edited_by.username if self.last_edited_by else self.last_edited_by_username_snapshot


class InventoryFormLine(Base):
    __tablename__ = "inventory_form_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    stock_total: Mapped[Optional[int]] = mapped_column(Integer)
    current_quantity: Mapped[Optional[int]] = mapped_column(Integer)
    outgoing_laundry: Mapped[Optional[int]] = mapped_column(Integer)
    incoming_clean: Mapped[Optional[int]] = mapped_column(Integer)
    status_observations: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    inventory_form: Mapped[InventoryForm] = relationship(back_populates="lines")
