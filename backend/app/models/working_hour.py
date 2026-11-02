"""Employee work-hour entries."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, Numeric, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WorkingHour(Base):
    __tablename__ = "working_hours"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    house_id: Mapped[int] = mapped_column(ForeignKey("houses.id", ondelete="CASCADE"), nullable=False, index=True)
    work_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    service: Mapped[str] = mapped_column(String(32), nullable=False)
    task: Mapped[str] = mapped_column(String(280), nullable=False)
    hourly_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="working_hours")
    house: Mapped["House"] = relationship(back_populates="working_hours")
    history: Mapped[list["WorkingHourHistory"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan", passive_deletes=True
    )


class WorkingHourHistory(Base):
    """Immutable audit events for edits, deletes, and restores."""

    __tablename__ = "working_hour_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    working_hour_id: Mapped[int] = mapped_column(
        ForeignKey("working_hours.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[int] = mapped_column(Integer, nullable=False)
    actor_username: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    before_state: Mapped[Optional[dict[str, object]]] = mapped_column(JSON, nullable=True)
    after_state: Mapped[Optional[dict[str, object]]] = mapped_column(JSON, nullable=True)

    entry: Mapped[WorkingHour] = relationship(back_populates="history")
