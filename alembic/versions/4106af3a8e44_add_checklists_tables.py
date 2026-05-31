"""add checklists tables

Revision ID: 4106af3a8e44
Revises: 4241185b5043
Create Date: 2026-05-31 21:40:07.590795
"""

from typing import Sequence, Union

import advanced_alchemy
import sqlalchemy as sa
from alembic import op


revision: str = "4106af3a8e44"
down_revision: Union[str, Sequence[str], None] = "4241185b5043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "checklists",
        sa.Column("id", advanced_alchemy.types.guid.GUID(length=16), nullable=False),
        sa.Column(
            "port_call_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("checklist_type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "checklist_type IN ('Pre-Arrival', 'Pre-Departure')",
            name=op.f("ck_checklists_checklist_type"),
        ),
        sa.CheckConstraint(
            "status IN ('Open', 'Completed')",
            name=op.f("ck_checklists_status"),
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_checklists_port_call_id_port_calls"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_checklists")),
    )
    with op.batch_alter_table("checklists", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_checklists_port_call_id"),
            ["port_call_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_checklists_status"),
            ["status"],
            unique=False,
        )

    op.create_table(
        "checklist_items",
        sa.Column("id", advanced_alchemy.types.guid.GUID(length=16), nullable=False),
        sa.Column(
            "checklist_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("item_name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "signed_off_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "signed_off_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "status IN ('Pending', 'Signed Off')",
            name=op.f("ck_checklist_items_status"),
        ),
        sa.ForeignKeyConstraint(
            ["checklist_id"],
            ["checklists.id"],
            name=op.f("fk_checklist_items_checklist_id_checklists"),
        ),
        sa.ForeignKeyConstraint(
            ["signed_off_by"],
            ["users.id"],
            name=op.f("fk_checklist_items_signed_off_by_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_checklist_items")),
    )
    with op.batch_alter_table("checklist_items", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_checklist_items_checklist_id"),
            ["checklist_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_checklist_items_status"),
            ["status"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("checklist_items", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_checklist_items_status"))
        batch_op.drop_index(batch_op.f("ix_checklist_items_checklist_id"))

    op.drop_table("checklist_items")

    with op.batch_alter_table("checklists", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_checklists_status"))
        batch_op.drop_index(batch_op.f("ix_checklists_port_call_id"))

    op.drop_table("checklists")
