"""voyage_instructions M9 — instruction_templates + voyage_instructions tables

Revision ID: d1e2f3a4b5c6
Revises: c1d2e3f4a5b6
Create Date: 2026-06-04

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone

import advanced_alchemy.types.datetime
import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_STATUSES = ("draft", "approved", "sent")
_STATUS_CHECK = "status IN (" + ", ".join(f"'{v}'" for v in _STATUSES) + ")"

# Seeded standard templates
_TEMPLATES = [
    {
        "id": str(uuid.UUID("10000000-0000-0000-0000-000000000001")),
        "name": "Standard Voyage Orders",
        "body_html": (
            "<h2>Standard Voyage Orders</h2>"
            "<h3>Reporting Cadence</h3>"
            "<p>Master to submit Noon Reports daily at 12:00 UTC. "
            "Arrival and Departure reports within 2 hours of event.</p>"
            "<h3>ROB &amp; Bunker Reporting</h3>"
            "<p>All ROB figures to be reported in MT per grade (VLSFO, LSMGO, MGO). "
            "BDN copies to be forwarded within 24 hours of bunkering.</p>"
            "<h3>Agent Communications</h3>"
            "<p>Master to contact appointed agents 48 hours prior to ETA. "
            "Copy all port communications to Operations.</p>"
            "<h3>Weather Routing</h3>"
            "<p>Follow recommended weather route. Advise Operations immediately "
            "if deviation exceeds 50nm or causes ETA change &gt; 6 hours.</p>"
            "<h3>EU-MRV / CII Notes</h3>"
            "<p>All fuel consumption data must be accurately reported for MRV compliance. "
            "Maintain speed optimisation in line with CII targets.</p>"
        ),
    },
    {
        "id": str(uuid.UUID("10000000-0000-0000-0000-000000000002")),
        "name": "Ballast Voyage Orders",
        "body_html": (
            "<h2>Ballast Voyage Orders</h2>"
            "<h3>Speed &amp; Consumption</h3>"
            "<p>Proceed to load port at economical speed. "
            "Target consumption not to exceed chartered allowance.</p>"
            "<h3>Arrival Procedures</h3>"
            "<p>Submit Pre-Arrival Notification 72/48/24 hours before ETA. "
            "Ensure all cargo gear is ready for survey on arrival.</p>"
            "<h3>Ballast Management</h3>"
            "<p>Exchange ballast water in accordance with BWM Convention. "
            "Complete Ballast Water Record Book entries.</p>"
        ),
    },
    {
        "id": str(uuid.UUID("10000000-0000-0000-0000-000000000003")),
        "name": "Laden Voyage Orders",
        "body_html": (
            "<h2>Laden Voyage Orders</h2>"
            "<h3>Cargo Care</h3>"
            "<p>Monitor cargo condition throughout voyage. "
            "Report any temperature/condition changes immediately.</p>"
            "<h3>Speed Instructions</h3>"
            "<p>Maintain instructed speed. Any deviation requires Operations approval.</p>"
            "<h3>Discharge Port Procedures</h3>"
            "<p>Notify discharge agents 72/48/24 hours before ETA. "
            "Prepare all cargo documentation for timely discharge.</p>"
        ),
    },
    {
        "id": str(uuid.UUID("10000000-0000-0000-0000-000000000004")),
        "name": "Port Instructions",
        "body_html": (
            "<h2>Port Instructions</h2>"
            "<h3>Agent &amp; Berth</h3>"
            "<p>Contact appointed agent on arrival. Berth assignment per port authority.</p>"
            "<h3>Operations</h3>"
            "<p>Cargo operations to commence after completion of port formalities. "
            "Maintain continuous watch during cargo operations.</p>"
            "<h3>Documentation</h3>"
            "<p>Ensure Statement of Facts, Time Sheet, and NOR records are maintained accurately.</p>"
        ),
    },
    {
        "id": str(uuid.UUID("10000000-0000-0000-0000-000000000005")),
        "name": "Blank",
        "body_html": "<p></p>",
    },
]


def upgrade() -> None:
    now = datetime.now(timezone.utc)

    # 1. instruction_templates
    op.create_table(
        "instruction_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instruction_templates")),
        sa.UniqueConstraint("name", name=op.f("uq_instruction_templates_name")),
    )

    # Seed templates — insert id as BINARY(16) bytes to match advanced_alchemy UUID storage
    conn = op.get_bind()
    for t in _TEMPLATES:
        conn.execute(
            sa.text(
                "INSERT INTO instruction_templates "
                "(id, name, body_html, created_at, updated_at) "
                "VALUES (:id, :name, :body_html, :created_at, :updated_at)"
            ),
            {
                "id": uuid.UUID(t["id"]).bytes,
                "name": t["name"],
                "body_html": t["body_html"],
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            },
        )

    # 2. voyage_instructions
    op.create_table(
        "voyage_instructions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("voyage_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(15), nullable=False, server_default="draft"),
        sa.Column("template_id", sa.Uuid(), nullable=True),
        sa.Column("approved_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=True),
        sa.Column("sent_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=True),
        sa.Column("sent_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["voyage_id"], ["voyages.id"],
            name=op.f("fk_voyage_instructions_voyage_id_voyages")),
        sa.ForeignKeyConstraint(["template_id"], ["instruction_templates.id"],
            name=op.f("fk_voyage_instructions_template_id_instruction_templates")),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"],
            name=op.f("fk_voyage_instructions_approved_by_users")),
        sa.ForeignKeyConstraint(["sent_by"], ["users.id"],
            name=op.f("fk_voyage_instructions_sent_by_users")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voyage_instructions")),
        sa.CheckConstraint(_STATUS_CHECK, name=op.f("ck_voyage_instructions_status")),
    )
    op.create_index(op.f("ix_voyage_instructions_voyage_id"), "voyage_instructions", ["voyage_id"])
    op.create_index(op.f("ix_voyage_instructions_status"), "voyage_instructions", ["status"])


def downgrade() -> None:
    op.drop_index(op.f("ix_voyage_instructions_status"), "voyage_instructions")
    op.drop_index(op.f("ix_voyage_instructions_voyage_id"), "voyage_instructions")
    op.drop_table("voyage_instructions")
    op.drop_table("instruction_templates")
