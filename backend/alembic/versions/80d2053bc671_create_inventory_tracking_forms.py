"""Create per-house inventory tracking sheets and rows.

Revision ID: 80d2053bc671
Revises: 47e5b6c8d2f1
Create Date: 2026-09-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "80d2053bc671"
down_revision: Union[str, Sequence[str], None] = "47e5b6c8d2f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "inventory_forms",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "house_id",
            sa.Integer(),
            sa.ForeignKey("houses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("count_date", sa.Date(), nullable=False),
        sa.Column("operation_types", sa.JSON(), nullable=False),
        sa.Column("room_division", sa.String(length=255), nullable=False),
        sa.Column("responsible", sa.String(length=255), nullable=False),
        sa.Column("counter_name", sa.String(length=255), nullable=False),
        sa.Column("responsible_signature", sa.String(length=255), nullable=False),
        sa.Column("checked_by", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_inventory_forms_house_id", "inventory_forms", ["house_id"])

    op.create_table(
        "inventory_form_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "form_id",
            sa.Integer(),
            sa.ForeignKey("inventory_forms.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("stock_total", sa.Integer(), nullable=True),
        sa.Column("current_quantity", sa.Integer(), nullable=True),
        sa.Column("outgoing_laundry", sa.Integer(), nullable=True),
        sa.Column("incoming_clean", sa.Integer(), nullable=True),
        sa.Column("status_observations", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
    )
    op.create_index("ix_inventory_form_lines_form_id", "inventory_form_lines", ["form_id"])


def downgrade() -> None:
    op.drop_index("ix_inventory_form_lines_form_id", table_name="inventory_form_lines")
    op.drop_table("inventory_form_lines")
    op.drop_index("ix_inventory_forms_house_id", table_name="inventory_forms")
    op.drop_table("inventory_forms")
