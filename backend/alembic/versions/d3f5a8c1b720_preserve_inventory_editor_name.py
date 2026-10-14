"""Keep the last editor's name with inventory history."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3f5a8c1b720"
down_revision: Union[str, Sequence[str], None] = "c2d7e9a4f610"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "inventory_forms",
        sa.Column("last_edited_by_username_snapshot", sa.String(length=64), nullable=True),
    )
    op.execute(
        "UPDATE inventory_forms "
        "SET last_edited_by_username_snapshot = "
        "(SELECT username FROM users WHERE users.id = inventory_forms.last_edited_by_user_id) "
        "WHERE last_edited_by_user_id IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("inventory_forms", "last_edited_by_username_snapshot")
