"""Update house color palette.

Revision ID: 0c479d6e1af1
Revises: f30a7d918b42
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0c479d6e1af1"
down_revision: Union[str, Sequence[str], None] = "f30a7d918b42"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Move existing default colors to the new palette."""
    op.execute("UPDATE houses SET color = 'blue' WHERE color = 'amber'")
    op.alter_column("houses", "color", server_default="blue")


def downgrade() -> None:
    """Restore the previous default color."""
    op.execute("UPDATE houses SET color = 'amber' WHERE color = 'blue'")
    op.alter_column("houses", "color", server_default="amber")
