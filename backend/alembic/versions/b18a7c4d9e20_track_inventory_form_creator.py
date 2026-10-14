"""Track the user who created each inventory form."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b18a7c4d9e20"
down_revision: Union[str, Sequence[str], None] = "a7c9e2d4f610"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("inventory_forms") as batch_op:
        batch_op.add_column(sa.Column("created_by_user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_inventory_forms_created_by_user_id_users",
            "users",
            ["created_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index(
        "ix_inventory_forms_created_by_user_id",
        "inventory_forms",
        ["created_by_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_inventory_forms_created_by_user_id", table_name="inventory_forms")
    with op.batch_alter_table("inventory_forms") as batch_op:
        batch_op.drop_constraint("fk_inventory_forms_created_by_user_id_users", type_="foreignkey")
        batch_op.drop_column("created_by_user_id")
