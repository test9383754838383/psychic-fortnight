"""voyage_notes M11 — voyage_notes + note_attachments tables

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-06-04

Categories (CHECK): Operational, Commercial, Safety, Agent
Priorities (CHECK): Low, Normal, High
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

import advanced_alchemy.types.datetime

revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "voyage_notes",
        sa.Column("id", sa.LargeBinary(length=16), nullable=False),
        sa.Column("voyage_id", sa.LargeBinary(length=16), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False, server_default="Operational"),
        sa.Column("priority", sa.String(length=10), nullable=False, server_default="Normal"),
        sa.Column("author_user_id", sa.LargeBinary(length=16), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(), nullable=False),
        sa.ForeignKeyConstraint(["voyage_id"], ["voyages.id"], name="fk_voyage_notes_voyage"),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], name="fk_voyage_notes_author"),
        sa.CheckConstraint(
            "category IN ('Operational','Commercial','Safety','Agent')",
            name="ck_voyage_notes_category",
        ),
        sa.CheckConstraint(
            "priority IN ('Low','Normal','High')",
            name="ck_voyage_notes_priority",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_voyage_notes"),
    )
    op.create_index("ix_voyage_notes_voyage_id", "voyage_notes", ["voyage_id"])
    op.create_index(
        "ix_voyage_notes_voyage_priority",
        "voyage_notes",
        ["voyage_id", "priority"],
    )

    op.create_table(
        "note_attachments",
        sa.Column("id", sa.LargeBinary(length=16), nullable=False),
        sa.Column("note_id", sa.LargeBinary(length=16), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("stored_path", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.LargeBinary(length=16), nullable=False),
        sa.Column("sa_orm_sentinel", sa.Integer(), nullable=True),
        sa.Column("created_at", advanced_alchemy.types.datetime.DateTimeUTC(), nullable=False),
        sa.Column("updated_at", advanced_alchemy.types.datetime.DateTimeUTC(), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"], ["voyage_notes.id"],
            name="fk_note_attachments_note",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by"], ["users.id"],
            name="fk_note_attachments_uploader",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_note_attachments"),
    )
    op.create_index("ix_note_attachments_note_id", "note_attachments", ["note_id"])


def downgrade() -> None:
    op.drop_index("ix_note_attachments_note_id", table_name="note_attachments")
    op.drop_table("note_attachments")
    op.drop_index("ix_voyage_notes_voyage_priority", table_name="voyage_notes")
    op.drop_index("ix_voyage_notes_voyage_id", table_name="voyage_notes")
    op.drop_table("voyage_notes")
