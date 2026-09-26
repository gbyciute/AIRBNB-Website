"""Migrate legacy house colors to the current palette.

Revision ID: 47e5b6c8d2f1
Revises: 0c479d6e1af1
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "47e5b6c8d2f1"
down_revision: Union[str, Sequence[str], None] = "0c479d6e1af1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Map colors saved by the previous picker to the new palette."""
    op.execute(
        """
        UPDATE houses
        SET color = CASE color
            WHEN 'amber' THEN 'blue'
            WHEN 'rose' THEN 'wine'
            WHEN 'sky' THEN 'cyan'
            WHEN 'emerald' THEN 'green'
            WHEN 'violet' THEN 'purple'
            ELSE color
        END
        """
    )


def downgrade() -> None:
    """Keep the current colors when rolling this data migration back."""
