"""Add metadata records for tracking-sheet photos."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d47ac9183f20"
down_revision: Union[str, Sequence[str], None] = "c318f7a2d904"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_form_photos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("form_id", sa.Integer(), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=64), server_default="image/webp", nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["form_id"], ["inventory_forms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("object_key"),
    )
    op.create_index(op.f("ix_inventory_form_photos_form_id"), "inventory_form_photos", ["form_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_form_photos_form_id"), table_name="inventory_form_photos")
    op.drop_table("inventory_form_photos")
