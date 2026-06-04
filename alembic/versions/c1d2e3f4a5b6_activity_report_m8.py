"""activity_report M8 — activity_reports + activity_report_bunkers + port_call_bunker_robs provenance

Revision ID: c1d2e3f4a5b6
Revises: b1c2d3e4f5a6
Create Date: 2026-06-04

"""
from typing import Sequence, Union

import advanced_alchemy.types.datetime
import sqlalchemy as sa
from alembic import op

revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_REPORT_TYPES = ("COMMENCING", "NOON", "ARRIVAL", "DEPARTURE", "TERMINATING")
_REPORT_STATUSES = ("DRAFT", "SUBMITTED", "APPROVED")
_FUEL_GRADES = ("VLSFO", "LSMGO", "HSFO", "MGO", "LNG")
_ROB_STATUSES = ("estimated", "reported", "confirmed", "overridden")

_TYPE_CHECK = "report_type IN (" + ", ".join(f"'{v}'" for v in _REPORT_TYPES) + ")"
_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _REPORT_STATUSES) + ")"
_GRADE_CHECK = "fuel_grade IN (" + ", ".join(f"'{v}'" for v in _FUEL_GRADES) + ")"
_ROB_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _ROB_STATUSES) + ")"


def upgrade() -> None:
    # 1. Create activity_reports
    op.create_table(
        "activity_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("voyage_id", sa.Uuid(), nullable=False),
        sa.Column("port_call_id", sa.Uuid(), nullable=True),
        sa.Column("report_type", sa.String(20), nullable=False),
        sa.Column("report_datetime", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("latitude", sa.Numeric(8, 5), nullable=True),
        sa.Column("longitude", sa.Numeric(8, 5), nullable=True),
        sa.Column("wind_force", sa.Integer(), nullable=True),
        sa.Column("sea_state", sa.Integer(), nullable=True),
        sa.Column("swell", sa.String(20), nullable=True),
        sa.Column("rpm", sa.Numeric(6, 2), nullable=True),
        sa.Column("slip_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("speed_kn", sa.Numeric(6, 2), nullable=True),
        sa.Column("distance_nm", sa.Numeric(8, 2), nullable=True),
        sa.Column("status", sa.String(15), nullable=False, server_default="DRAFT"),
        sa.Column("approved_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["voyage_id"], ["voyages.id"],
            name=op.f("fk_activity_reports_voyage_id_voyages")),
        sa.ForeignKeyConstraint(["port_call_id"], ["port_calls.id"],
            name=op.f("fk_activity_reports_port_call_id_port_calls")),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"],
            name=op.f("fk_activity_reports_approved_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_reports")),
        sa.CheckConstraint(_TYPE_CHECK, name=op.f("ck_activity_reports_report_type")),
        sa.CheckConstraint(_STATUS_CHECK, name=op.f("ck_activity_reports_status")),
    )
    op.create_index(op.f("ix_activity_reports_voyage_id"), "activity_reports", ["voyage_id"])
    op.create_index(op.f("ix_activity_reports_port_call_id"), "activity_reports", ["port_call_id"])
    op.create_index(op.f("ix_activity_reports_status"), "activity_reports", ["status"])

    # 2. Create activity_report_bunkers
    op.create_table(
        "activity_report_bunkers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("activity_report_id", sa.Uuid(), nullable=False),
        sa.Column("fuel_grade", sa.String(10), nullable=False),
        sa.Column("reported_rob_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("reported_consumption_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("received_mt", sa.Numeric(12, 3), nullable=True),
        sa.Column("sulphur_pct", sa.Numeric(5, 4), nullable=True),
        sa.Column("bdn_number", sa.String(100), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["activity_report_id"], ["activity_reports.id"],
            name=op.f("fk_activity_report_bunkers_activity_report_id_activity_reports")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_activity_report_bunkers")),
        sa.CheckConstraint(_GRADE_CHECK, name=op.f("ck_activity_report_bunkers_fuel_grade")),
    )
    op.create_index(
        op.f("ix_activity_report_bunkers_activity_report_id"),
        "activity_report_bunkers", ["activity_report_id"],
    )

    # 3. Add provenance columns + constraints to port_call_bunker_robs
    # SQLite requires batch mode for structural changes to existing tables.
    with op.batch_alter_table("port_call_bunker_robs") as batch_op:
        batch_op.add_column(sa.Column("arrival_source_report_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("departure_source_report_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("received_source_report_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="estimated"))
        batch_op.add_column(sa.Column("confirmed_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("confirmed_by", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("reconciliation_status", sa.String(30), nullable=True))
        batch_op.add_column(sa.Column("reported_vs_delta_variance_mt", sa.Numeric(12, 3), nullable=True))
        batch_op.create_foreign_key(
            "fk_pcbr_arrival_src",
            "activity_reports", ["arrival_source_report_id"], ["id"],
        )
        batch_op.create_foreign_key(
            "fk_pcbr_departure_src",
            "activity_reports", ["departure_source_report_id"], ["id"],
        )
        batch_op.create_foreign_key(
            "fk_pcbr_received_src",
            "activity_reports", ["received_source_report_id"], ["id"],
        )
        batch_op.create_foreign_key(
            "fk_pcbr_confirmed_by",
            "users", ["confirmed_by"], ["id"],
        )
        batch_op.create_check_constraint(
            "ck_port_call_bunker_robs_status",
            _ROB_STATUS_CHECK,
        )


def downgrade() -> None:
    # 3. Remove provenance columns from port_call_bunker_robs (batch for SQLite)
    with op.batch_alter_table("port_call_bunker_robs") as batch_op:
        batch_op.drop_constraint("ck_port_call_bunker_robs_status", type_="check")
        batch_op.drop_constraint("fk_pcbr_confirmed_by", type_="foreignkey")
        batch_op.drop_constraint("fk_pcbr_received_src", type_="foreignkey")
        batch_op.drop_constraint("fk_pcbr_departure_src", type_="foreignkey")
        batch_op.drop_constraint("fk_pcbr_arrival_src", type_="foreignkey")
        batch_op.drop_column("reported_vs_delta_variance_mt")
        batch_op.drop_column("reconciliation_status")
        batch_op.drop_column("confirmed_by")
        batch_op.drop_column("confirmed_at")
        batch_op.drop_column("status")
        batch_op.drop_column("received_source_report_id")
        batch_op.drop_column("departure_source_report_id")
        batch_op.drop_column("arrival_source_report_id")

    # 2. Drop activity_report_bunkers
    op.drop_index(op.f("ix_activity_report_bunkers_activity_report_id"), "activity_report_bunkers")
    op.drop_table("activity_report_bunkers")

    # 1. Drop activity_reports
    op.drop_index(op.f("ix_activity_reports_status"), "activity_reports")
    op.drop_index(op.f("ix_activity_reports_port_call_id"), "activity_reports")
    op.drop_index(op.f("ix_activity_reports_voyage_id"), "activity_reports")
    op.drop_table("activity_reports")
