"""voyages m1 hardening

Convert ops_coordinator_user_id from String(100) to UUID FK → users.id.

Revision ID: e8f2a3b4c5d6
Revises: 78c196c1abc2
Create Date: 2026-06-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import advanced_alchemy


revision: str = "e8f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "78c196c1abc2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Null out existing string values — they are not valid UUIDs
    op.execute("UPDATE voyages SET ops_coordinator_user_id = NULL")

    with op.batch_alter_table("voyages", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_voyages_ops_coordinator_user_id"))
        batch_op.drop_column("ops_coordinator_user_id")
        batch_op.add_column(
            sa.Column(
                "ops_coordinator_user_id",
                advanced_alchemy.types.guid.GUID(length=16),
                nullable=True,
            )
        )
        batch_op.create_foreign_key(
            "fk_voyages_ops_coordinator_user_id_users",
            "users",
            ["ops_coordinator_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            batch_op.f("ix_voyages_ops_coordinator_user_id"),
            ["ops_coordinator_user_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("voyages", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_voyages_ops_coordinator_user_id"))
        batch_op.drop_constraint(
            "fk_voyages_ops_coordinator_user_id_users", type_="foreignkey"
        )
        batch_op.drop_column("ops_coordinator_user_id")
        batch_op.add_column(
            sa.Column(
                "ops_coordinator_user_id",
                sa.String(length=100),
                nullable=True,
            )
        )
        batch_op.create_index(
            batch_op.f("ix_voyages_ops_coordinator_user_id"),
            ["ops_coordinator_user_id"],
            unique=False,
        )
