"""Add work-hour edit history and soft-delete recovery."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9ab24e60c531"
down_revision: Union[str, Sequence[str], None] = "e4c8b1a7d239"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("working_hours", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "working_hour_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("working_hour_id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.Integer(), nullable=False),
        sa.Column("actor_username", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=16), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("before_state", sa.JSON(), nullable=True),
        sa.Column("after_state", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["working_hour_id"], ["working_hours.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_working_hour_history_working_hour_id"), "working_hour_history", ["working_hour_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_working_hour_history_working_hour_id"), table_name="working_hour_history")
    op.drop_table("working_hour_history")
    op.drop_column("working_hours", "deleted_at")
