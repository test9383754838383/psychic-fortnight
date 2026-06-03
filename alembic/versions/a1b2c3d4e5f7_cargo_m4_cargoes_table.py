"""cargo M4 cargoes table

Revision ID: a1b2c3d4e5f7
Revises: f1a2b3c4d5e6
Create Date: 2026-06-04

"""
from typing import Sequence, Union

import advanced_alchemy.types.datetime
import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COMMODITY_VALUES = (
    "Crude Oil", "Fuel Oil", "Gasoil", "Naphtha",
    "Grain", "Coal", "Iron Ore", "Containers", "Other"
)
_UNIT_VALUES = ("MT", "BBL", "CBM")

_COMMODITY_CHECK = "commodity IN (" + ", ".join(f"'{v}'" for v in _COMMODITY_VALUES) + ")"
_UNIT_CHECK = "unit IN (" + ", ".join(f"'{v}'" for v in _UNIT_VALUES) + ")"


def upgrade() -> None:
    op.create_table(
        "cargoes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("voyage_id", sa.Uuid(), nullable=False),
        sa.Column("commodity", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit", sa.String(10), nullable=False, server_default="MT"),
        sa.Column("load_port_ref", sa.Uuid(), nullable=True),
        sa.Column("discharge_port_ref", sa.Uuid(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["voyage_id"], ["voyages.id"], name=op.f("fk_cargoes_voyage_id_voyages")),
        sa.ForeignKeyConstraint(["load_port_ref"], ["ports.id"], name=op.f("fk_cargoes_load_port_ref_ports")),
        sa.ForeignKeyConstraint(["discharge_port_ref"], ["ports.id"], name=op.f("fk_cargoes_discharge_port_ref_ports")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_cargoes")),
        sa.CheckConstraint(_COMMODITY_CHECK, name=op.f("ck_cargoes_commodity")),
        sa.CheckConstraint(_UNIT_CHECK, name=op.f("ck_cargoes_unit")),
    )
    op.create_index(op.f("ix_cargoes_voyage_id"), "cargoes", ["voyage_id"])
    op.create_index(op.f("ix_cargoes_load_port_ref"), "cargoes", ["load_port_ref"])
    op.create_index(op.f("ix_cargoes_discharge_port_ref"), "cargoes", ["discharge_port_ref"])


def downgrade() -> None:
    op.drop_index(op.f("ix_cargoes_discharge_port_ref"), table_name="cargoes")
    op.drop_index(op.f("ix_cargoes_load_port_ref"), table_name="cargoes")
    op.drop_index(op.f("ix_cargoes_voyage_id"), table_name="cargoes")
    op.drop_table("cargoes")
