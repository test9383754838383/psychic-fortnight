"""add_alerts_tasks_tables

Revision ID: a2b3c4d5e6f7
Revises: 70d7eac2d01c
Create Date: 2026-06-01 08:01:00.000000

"""

from typing import Sequence, Union

import advanced_alchemy
import sqlalchemy as sa
from alembic import op

revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = "70d7eac2d01c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- alerts table ---
    op.create_table(
        "alerts",
        sa.Column("id", advanced_alchemy.types.guid.GUID(length=16), nullable=False),
        sa.Column("linked_entity_type", sa.String(length=50), nullable=False),
        sa.Column(
            "linked_entity_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("alert_type", sa.String(length=100), nullable=False),
        sa.Column(
            "triggered_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column("message", sa.String(length=2000), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column(
            "resolved_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "resolved_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("resolution_note", sa.String(length=2000), nullable=True),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "alert_type IN ("
            "'ETA Overdue', 'Departure Overdue', 'NOR Not Tendered', "
            "'Agent Not Confirmed', 'Form Not Received', 'Bunker Request Blocked', "
            "'Voyage Not Commenced', 'Performance Deviation', "
            "'Consumption Deviation', 'Noon Report Missing'"
            ")",
            name=op.f("ck_alerts_alert_type"),
        ),
        sa.CheckConstraint(
            "severity IN ('Info', 'Warning', 'Critical')",
            name=op.f("ck_alerts_severity"),
        ),
        sa.CheckConstraint(
            "linked_entity_type IN ('Voyage', 'PortCall', 'Vessel')",
            name=op.f("ck_alerts_linked_entity_type"),
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by"],
            ["users.id"],
            name=op.f("fk_alerts_resolved_by_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_alerts")),
    )

    # --- tasks table ---
    op.create_table(
        "tasks",
        sa.Column("id", advanced_alchemy.types.guid.GUID(length=16), nullable=False),
        sa.Column("linked_entity_type", sa.String(length=50), nullable=False),
        sa.Column(
            "linked_entity_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column(
            "assigned_to",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column(
            "due_datetime",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "originating_alert_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column(
            "created_by",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "completed_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "status IN ('Open', 'In Progress', 'Blocked', 'Done')",
            name=op.f("ck_tasks_status"),
        ),
        sa.CheckConstraint(
            "linked_entity_type IN ('Voyage', 'PortCall', 'Vessel')",
            name=op.f("ck_tasks_linked_entity_type"),
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to"],
            ["users.id"],
            name=op.f("fk_tasks_assigned_to_users"),
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_tasks_created_by_users"),
        ),
        sa.ForeignKeyConstraint(
            ["originating_alert_id"],
            ["alerts.id"],
            name=op.f("fk_tasks_originating_alert_id_alerts"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
    )


def downgrade() -> None:
    op.drop_table("tasks")
    op.drop_table("alerts")
