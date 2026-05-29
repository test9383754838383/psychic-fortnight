"""add_operational_reporting_tables

Revision ID: a1b2c3d4e5f6
Revises: 203ad034a5fa
Create Date: 2026-05-29 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import advanced_alchemy


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "203ad034a5fa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create port_activities, activity_logs, and operational_reports tables."""

    # --- port_activities ---------------------------------------------------
    op.create_table(
        "port_activities",
        sa.Column(
            "id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "port_call_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column(
            "event_timestamp",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "recorded_by_user_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "corrects_activity_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("correction_reason", sa.Text(), nullable=True),
        sa.Column(
            "sa_orm_sentinel",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        # event_type CHECK (21 values, D-LOCK-4)
        sa.CheckConstraint(
            "event_type IN ("
            "'Arrived', 'Anchored', 'Berthed', 'All Fast', "
            "'Commenced Loading', 'Completed Loading', "
            "'Commenced Discharging', 'Completed Discharging', "
            "'Hoses Connected', 'Hoses Disconnected', 'Departed', "
            "'NOR Tendered', 'NOR Re-tendered', 'NOR Accepted', "
            "'Free Pratique Granted', "
            "'Tugs Engaged', 'Tugs Released', "
            "'Bunkering Commenced', 'Bunkering Completed', "
            "'Delay Commenced', 'Delay Ended'"
            ")",
            name=op.f("ck_port_activities_event_type_enum"),
        ),
        # correction_reason required when corrects_activity_id set (D-LOCK-2)
        sa.CheckConstraint(
            "(corrects_activity_id IS NULL) OR (correction_reason IS NOT NULL)",
            name=op.f("ck_port_activities_correction_reason_required"),
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_port_activities_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"],
            ["users.id"],
            name=op.f("fk_port_activities_recorded_by_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["corrects_activity_id"],
            ["port_activities.id"],
            name=op.f("fk_port_activities_corrects_activity_id_port_activities"),
            use_alter=True,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_port_activities")),
    )
    with op.batch_alter_table("port_activities", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_port_activities_port_call_id"),
            ["port_call_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_port_activities_event_timestamp"),
            ["event_timestamp"],
            unique=False,
        )

    # --- activity_logs -----------------------------------------------------
    op.create_table(
        "activity_logs",
        sa.Column(
            "id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "port_call_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "logged_by_user_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column(
            "sa_orm_sentinel",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "logged_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_activity_logs_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["logged_by_user_id"],
            ["users.id"],
            name=op.f("fk_activity_logs_logged_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_logs")),
    )
    with op.batch_alter_table("activity_logs", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_activity_logs_port_call_id"),
            ["port_call_id"],
            unique=False,
        )

    # --- operational_reports -----------------------------------------------
    op.create_table(
        "operational_reports",
        sa.Column(
            "id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "voyage_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column(
            "port_call_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column("report_type", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column(
            "submitted_by_user_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=False,
        ),
        sa.Column(
            "submitted_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "received_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column("position_lat", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("position_lon", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("speed_24h", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("distance_to_go", sa.Numeric(precision=7, scale=2), nullable=True),
        sa.Column(
            "eta_next_port",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "bunker_rob_total_mt", sa.Numeric(precision=8, scale=3), nullable=True
        ),
        sa.Column("raw_content_ref", sa.Text(), nullable=True),
        sa.Column(
            "supersedes_report_id",
            advanced_alchemy.types.guid.GUID(length=16),
            nullable=True,
        ),
        sa.Column(
            "sa_orm_sentinel",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            advanced_alchemy.types.datetime.DateTimeUTC(timezone=True),
            nullable=False,
        ),
        # report_type CHECK (D-33)
        sa.CheckConstraint(
            "report_type IN ('Noon', 'Arrival', 'Departure', 'Bunkering', 'Statement of Facts')",
            name=op.f("ck_operational_reports_report_type"),
        ),
        # status CHECK (D-34)
        sa.CheckConstraint(
            "status IN ('Pending', 'Queried', 'Accepted', 'Rejected')",
            name=op.f("ck_operational_reports_status"),
        ),
        # XOR anchor CHECK (D-LOCK-5, D-39)
        sa.CheckConstraint(
            "(voyage_id IS NOT NULL AND port_call_id IS NULL) "
            "OR (voyage_id IS NULL AND port_call_id IS NOT NULL)",
            name=op.f("ck_operational_reports_anchor_xor"),
        ),
        sa.ForeignKeyConstraint(
            ["voyage_id"],
            ["voyages.id"],
            name=op.f("fk_operational_reports_voyage_id_voyages"),
        ),
        sa.ForeignKeyConstraint(
            ["port_call_id"],
            ["port_calls.id"],
            name=op.f("fk_operational_reports_port_call_id_port_calls"),
        ),
        sa.ForeignKeyConstraint(
            ["submitted_by_user_id"],
            ["users.id"],
            name=op.f("fk_operational_reports_submitted_by_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["supersedes_report_id"],
            ["operational_reports.id"],
            name=op.f(
                "fk_operational_reports_supersedes_report_id_operational_reports"
            ),
            use_alter=True,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_operational_reports")),
    )
    with op.batch_alter_table("operational_reports", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_operational_reports_voyage_id"),
            ["voyage_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_operational_reports_port_call_id"),
            ["port_call_id"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_operational_reports_status"),
            ["status"],
            unique=False,
        )


def downgrade() -> None:
    """Drop operational reporting tables."""
    with op.batch_alter_table("operational_reports", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_operational_reports_status"))
        batch_op.drop_index(batch_op.f("ix_operational_reports_port_call_id"))
        batch_op.drop_index(batch_op.f("ix_operational_reports_voyage_id"))

    op.drop_table("operational_reports")

    with op.batch_alter_table("activity_logs", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_activity_logs_port_call_id"))

    op.drop_table("activity_logs")

    with op.batch_alter_table("port_activities", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_port_activities_event_timestamp"))
        batch_op.drop_index(batch_op.f("ix_port_activities_port_call_id"))

    op.drop_table("port_activities")
