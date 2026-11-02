"""Add saved work-hour entries and employee display preferences."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e4c8b1a7d239"
down_revision: Union[str, Sequence[str], None] = "d3f5a8c1b720"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(length=64), nullable=True))
    op.add_column(
        "users",
        sa.Column("calendar_color", sa.String(length=20), server_default="emerald", nullable=False),
    )
    op.create_table(
        "working_hours",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("house_id", sa.Integer(), nullable=False),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("service", sa.String(length=32), nullable=False),
        sa.Column("task", sa.String(length=32), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["house_id"], ["houses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_working_hours_house_id"), "working_hours", ["house_id"], unique=False)
    op.create_index(op.f("ix_working_hours_user_id"), "working_hours", ["user_id"], unique=False)
    op.create_index(op.f("ix_working_hours_work_date"), "working_hours", ["work_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_working_hours_work_date"), table_name="working_hours")
    op.drop_index(op.f("ix_working_hours_user_id"), table_name="working_hours")
    op.drop_index(op.f("ix_working_hours_house_id"), table_name="working_hours")
    op.drop_table("working_hours")
    op.drop_column("users", "calendar_color")
    op.drop_column("users", "display_name")
