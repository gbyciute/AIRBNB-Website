from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class House(Base):
    __tablename__ = "houses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="blue", server_default="blue")
    inventory_forms: Mapped[list[InventoryForm]] = relationship(
        back_populates="house",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
