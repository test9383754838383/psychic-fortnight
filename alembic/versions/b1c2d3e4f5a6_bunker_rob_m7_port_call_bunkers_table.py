"""bunker_rob M7 port_call_bunker_robs table

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f7
Create Date: 2026-06-04

"""
from typing import Sequence, Union

import advanced_alchemy.types.datetime
import sqlalchemy as sa
from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a1b2c3d4e5f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FUEL_GRADES = ("VLSFO", "LSMGO", "HSFO", "MGO", "LNG")
_GRADE_CHECK = "fuel_grade IN (" + ", ".join(f"'{v}'" for v in _FUEL_GRADES) + ")"


def upgrade() -> None:
    op.create_table(
        "port_call_bunker_robs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("port_call_id", sa.Uuid(), nullable=False),
        sa.Column("voyage_id", sa.Uuid(), nullable=False),
        sa.Column("fuel_grade", sa.String(10), nullable=False),
        sa.Column("rob_arrival_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("received_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("port_consumption_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("rob_departure_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("sulphur_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("bdn_number", sa.String(100), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["port_call_id"], ["port_calls.id"],
            name=op.f("fk_port_call_bunker_robs_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["voyage_id"], ["voyages.id"],
            name=op.f("fk_port_call_bunker_robs_voyage_id_voyages"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_port_call_bunker_robs")),
        sa.CheckConstraint(_GRADE_CHECK, name=op.f("ck_port_call_bunker_robs_fuel_grade")),
    )
    op.create_index(
        op.f("ix_port_call_bunker_robs_port_call_id"),
        "port_call_bunker_robs", ["port_call_id"],
    )
    op.create_index(
        op.f("ix_port_call_bunker_robs_voyage_id"),
        "port_call_bunker_robs", ["voyage_id"],
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_port_call_bunker_robs_voyage_id"), table_name="port_call_bunker_robs")
    op.drop_index(op.f("ix_port_call_bunker_robs_port_call_id"), table_name="port_call_bunker_robs")
    op.drop_table("port_call_bunker_robs")
