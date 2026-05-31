"""add_bunker_requests_table

Revision ID: 9e894dc1920f
Revises: 4106af3a8e44
Create Date: 2026-06-01 02:07:36.369630

"""

from typing import Sequence, Union

import advanced_alchemy
import sqlalchemy as sa
from alembic import op

revision: str = "9e894dc1920f"
down_revision: Union[str, Sequence[str], None] = "4106af3a8e44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bunker_requests",
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
        sa.Column("fuel_type", sa.String(length=20), nullable=False),
        sa.Column("quantity_required_mt", sa.Numeric(precision=12, scale=3), nullable=False),
        sa.Column("specification_grade", sa.String(length=100), nullable=True),
        sa.Column("max_sulphur_content", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("blocker_note", sa.String(length=1000), nullable=True),
        sa.Column(
            "raised_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "raised_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "supplier_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column(
            "eta_supply",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "fuel_type IN ('HFO', 'VLSFO', 'MGO', 'LSMGO', 'HSFO', 'ULSD', 'LNG', 'Biofuel')",
            name=op.f("ck_bunker_requests_fuel_type"),
        ),
        sa.CheckConstraint(
            "status IN ('Raised', 'In Progress', 'Stemmed', 'Supplied', 'Blocked')",
            name=op.f("ck_bunker_requests_status"),
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_bunker_requests_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["raised_by"],
            ["users.id"],
            name=op.f("fk_bunker_requests_raised_by_users"),
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"],
            ["counterparties.id"],
            name=op.f("fk_bunker_requests_supplier_id_counterparties"),
        ),
        sa.ForeignKeyConstraint(
            ["voyage_id"],
            ["voyages.id"],
            name=op.f("fk_bunker_requests_voyage_id_voyages"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bunker_requests")),
    )
    with op.batch_alter_table("bunker_requests", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_bunker_requests_port_call_id"),
            ["port_call_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_bunker_requests_status"),
            ["status"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_bunker_requests_voyage_id"),
            ["voyage_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("bunker_requests", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_bunker_requests_voyage_id"))
        batch_op.drop_index(batch_op.f("ix_bunker_requests_status"))
        batch_op.drop_index(batch_op.f("ix_bunker_requests_port_call_id"))

    op.drop_table("bunker_requests")
