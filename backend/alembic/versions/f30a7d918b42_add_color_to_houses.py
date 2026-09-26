"""Add display color to houses.

Revision ID: f30a7d918b42
Revises: c0e4692c2758
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f30a7d918b42"
down_revision: Union[str, Sequence[str], None] = "c0e4692c2758"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the color selected for each house."""
    op.add_column(
        "houses",
        sa.Column("color", sa.String(length=20), nullable=False, server_default="amber"),
    )


def downgrade() -> None:
    """Remove the color column."""
    op.drop_column("houses", "color")
