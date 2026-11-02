"""Add break duration and allow longer work notes."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c318f7a2d904"
down_revision: Union[str, Sequence[str], None] = "9ab24e60c531"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "working_hours",
        sa.Column("break_minutes", sa.Integer(), server_default="0", nullable=False),
    )
    op.alter_column(
        "working_hours",
        "task",
        existing_type=sa.String(length=32),
        type_=sa.String(length=280),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "working_hours",
        "task",
        existing_type=sa.String(length=280),
        type_=sa.String(length=32),
        existing_nullable=False,
    )
    op.drop_column("working_hours", "break_minutes")
