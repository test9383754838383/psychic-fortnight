"""voyages_m2_itinerary_fields

Revision ID: 78c196c1abc2
Revises: 5419853becf2
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "78c196c1abc2"
down_revision: Union[str, None] = "5419853becf2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FN_OLD = "port_function IN ('Load','Discharge','Bunker','Canal','Transit','Repairs','Other')"
_FN_NEW = "port_function IN ('Load','Discharge','Ballast','Bunker','Canal','Transit','Repairs','Other')"


def upgrade() -> None:
    with op.batch_alter_table("itinerary_lines", schema=None) as batch_op:
        batch_op.add_column(sa.Column("speed_kts", sa.Numeric(5, 2), nullable=True))
        batch_op.add_column(sa.Column("distance_nm", sa.Numeric(8, 2), nullable=True))
        batch_op.add_column(sa.Column("eca_nm", sa.Numeric(8, 2), nullable=True))
        batch_op.drop_constraint("check_port_function_enum", type_="check")
        batch_op.create_check_constraint("check_port_function_enum", _FN_NEW)


def downgrade() -> None:
    with op.batch_alter_table("itinerary_lines", schema=None) as batch_op:
        batch_op.drop_constraint("check_port_function_enum", type_="check")
        batch_op.create_check_constraint("check_port_function_enum", _FN_OLD)
        batch_op.drop_column("eca_nm")
        batch_op.drop_column("distance_nm")
        batch_op.drop_column("speed_kts")
