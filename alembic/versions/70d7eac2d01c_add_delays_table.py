"""add_delays_table

Revision ID: 70d7eac2d01c
Revises: 9e894dc1920f
Create Date: 2026-06-01 02:30:20.429873

"""

from typing import Sequence, Union

import advanced_alchemy
import sqlalchemy as sa
from alembic import op

revision: str = "70d7eac2d01c"
down_revision: Union[str, Sequence[str], None] = "9e894dc1920f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "delays",
        sa.Column("id", advanced_alchemy.types.guid.GUID(length=16), nullable=False),
        sa.Column(
            "voyage_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "port_call_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("leg_ref", sa.String(length=255), nullable=True),
        sa.Column("delay_type", sa.String(length=50), nullable=False),
        sa.Column("fault_attribution", sa.String(length=50), nullable=False),
        sa.Column(
            "start_datetime",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "end_datetime",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "claimed_duration", sa.Numeric(precision=10, scale=2), nullable=True
        ),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column(
            "recorded_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "approved_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "delay_type IN ("
            "'Weather', 'Mechanical', 'Port Congestion', 'Awaiting Berth', "
            "'Awaiting Orders', 'Cargo Operations', 'Bunkering Delay', "
            "'Strike', 'Deviation', 'Piracy/Security', 'Quarantine/Disease', 'Other'"
            ")",
            name=op.f("ck_delays_delay_type"),
        ),
        sa.CheckConstraint(
            "fault_attribution IN ("
            "'Vessel', 'Charterer', 'Port', 'Weather', 'Force Majeure'"
            ")",
            name=op.f("ck_delays_fault_attribution"),
        ),
        sa.CheckConstraint(
            "NOT (port_call_id IS NOT NULL AND leg_ref IS NOT NULL)",
            name=op.f("ck_delays_anchor_xor"),
        ),
        sa.ForeignKeyConstraint(
            ["approved_by"],
            ["users.id"],
            name=op.f("fk_delays_approved_by_users"),
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_delays_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by"],
            ["users.id"],
            name=op.f("fk_delays_recorded_by_users"),
        ),
        sa.ForeignKeyConstraint(
            ["voyage_id"],
            ["voyages.id"],
            name=op.f("fk_delays_voyage_id_voyages"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_delays")),
    )
    with op.batch_alter_table("delays", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_delays_voyage_id"),
            ["voyage_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_delays_port_call_id"),
            ["port_call_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("delays", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_delays_port_call_id"))
        batch_op.drop_index(batch_op.f("ix_delays_voyage_id"))

    op.drop_table("delays")
