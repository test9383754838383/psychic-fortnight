"""port_call M3 draft fields

Adds 4 draft depth columns to port_calls.

Revision ID: f1a2b3c4d5e6
Revises: e8f2a3b4c5d6
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e8f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("port_calls", schema=None) as batch_op:
        batch_op.add_column(sa.Column("arrival_draft_fwd", sa.Numeric(5, 2), nullable=True))
        batch_op.add_column(sa.Column("arrival_draft_aft", sa.Numeric(5, 2), nullable=True))
        batch_op.add_column(sa.Column("departure_draft_fwd", sa.Numeric(5, 2), nullable=True))
        batch_op.add_column(sa.Column("departure_draft_aft", sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("port_calls", schema=None) as batch_op:
        batch_op.drop_column("departure_draft_aft")
        batch_op.drop_column("departure_draft_fwd")
        batch_op.drop_column("arrival_draft_aft")
        batch_op.drop_column("arrival_draft_fwd")
