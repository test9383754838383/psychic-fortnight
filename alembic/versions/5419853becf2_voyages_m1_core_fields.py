"""voyages m1 core fields

Adds M1 Voyage Core fields to voyages: ops_coordinator_user_id, trade_area,
lob, and the Pool/Ice/Clean/Coated flags; expands the status check constraint
to include 'Forecast'.

Revision ID: 5419853becf2
Revises: a2b3c4d5e6f7
Create Date: 2026-06-03 13:56:49.638049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5419853becf2"
down_revision: Union[str, Sequence[str], None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_STATUS_OLD = "status IN ('Scheduled', 'Commenced', 'Completed', 'Closed', 'Cancelled')"
_STATUS_NEW = (
    "status IN ('Forecast', 'Scheduled', 'Commenced', 'Completed', 'Closed', 'Cancelled')"
)


def upgrade() -> None:
    with op.batch_alter_table("voyages", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("ops_coordinator_user_id", sa.String(length=100), nullable=True)
        )
        batch_op.add_column(sa.Column("trade_area", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("lob", sa.String(length=50), nullable=True))
        batch_op.add_column(
            sa.Column(
                "is_pool", sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.add_column(
            sa.Column(
                "is_ice_class", sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.add_column(
            sa.Column(
                "is_clean", sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.add_column(
            sa.Column(
                "is_coated", sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )
        batch_op.drop_constraint("check_voyage_status_enum", type_="check")
        batch_op.create_check_constraint("check_voyage_status_enum", _STATUS_NEW)
        batch_op.create_index(
            batch_op.f("ix_voyages_ops_coordinator_user_id"),
            ["ops_coordinator_user_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("voyages", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_voyages_ops_coordinator_user_id"))
        batch_op.drop_constraint("check_voyage_status_enum", type_="check")
        batch_op.create_check_constraint("check_voyage_status_enum", _STATUS_OLD)
        batch_op.drop_column("is_coated")
        batch_op.drop_column("is_clean")
        batch_op.drop_column("is_ice_class")
        batch_op.drop_column("is_pool")
        batch_op.drop_column("lob")
        batch_op.drop_column("trade_area")
        batch_op.drop_column("ops_coordinator_user_id")
