"""add_forms_tables

Revision ID: 4241185b5043
Revises: a1b2c3d4e5f6
Create Date: 2026-05-31 19:23:12.783508

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import advanced_alchemy


# revision identifiers, used by Alembic.
revision: str = '4241185b5043'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('forms',
    sa.Column('id', advanced_alchemy.types.guid.GUID(length=16), nullable=False),
    sa.Column('form_type', sa.String(length=30), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('voyage_id', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('port_call_id', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('submitted_by', advanced_alchemy.types.guid.GUID(length=16), nullable=False),
    sa.Column('submitted_at', sa.DateTime(), nullable=False),
    sa.Column('received_at', sa.DateTime(), nullable=False),
    sa.Column('assigned_to', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('reviewed_by', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('accepted_parse_attempt_id', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('sa_orm_sentinel', sa.Integer(), nullable=True),
    sa.Column('created_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.Column('updated_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.CheckConstraint("form_type IN ('Arrival', 'Departure', 'Noon', 'Statement of Facts', 'Bunkering')", name=op.f('ck_forms_form_type')),
    sa.CheckConstraint("status IN ('Received', 'Under Review', 'Queried', 'Accepted', 'Rejected')", name=op.f('ck_forms_status')),
    sa.CheckConstraint('(voyage_id IS NOT NULL AND port_call_id IS NULL) OR (voyage_id IS NULL AND port_call_id IS NOT NULL)', name=op.f('ck_forms_anchor_xor')),
    sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], name=op.f('fk_forms_assigned_to_users')),
    sa.ForeignKeyConstraint(['port_call_id'], ['port_calls.id'], name=op.f('fk_forms_port_call_id_port_calls')),
    sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], name=op.f('fk_forms_reviewed_by_users')),
    sa.ForeignKeyConstraint(['submitted_by'], ['users.id'], name=op.f('fk_forms_submitted_by_users')),
    sa.ForeignKeyConstraint(['voyage_id'], ['voyages.id'], name=op.f('fk_forms_voyage_id_voyages')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_forms'))
    )
    with op.batch_alter_table('forms', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_forms_port_call_id'), ['port_call_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_forms_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_forms_voyage_id'), ['voyage_id'], unique=False)

    op.create_table('form_parse_attempts',
    sa.Column('id', advanced_alchemy.types.guid.GUID(length=16), nullable=False),
    sa.Column('form_id', advanced_alchemy.types.guid.GUID(length=16), nullable=True),
    sa.Column('provider', sa.String(length=50), nullable=False),
    sa.Column('model', sa.String(length=50), nullable=False),
    sa.Column('prompt_version', sa.String(length=20), nullable=False),
    sa.Column('schema_version', sa.String(length=20), nullable=False),
    sa.Column('retry_no', sa.Integer(), nullable=False),
    sa.Column('input_tokens', sa.Integer(), nullable=False),
    sa.Column('output_tokens', sa.Integer(), nullable=False),
    sa.Column('cost_estimate', sa.Float(), nullable=False),
    sa.Column('latency_ms', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('sa_orm_sentinel', sa.Integer(), nullable=True),
    sa.Column('created_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.Column('updated_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['form_id'], ['forms.id'], name=op.f('fk_form_parse_attempts_form_id_forms')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_form_parse_attempts'))
    )

    op.create_table('form_details',
    sa.Column('id', advanced_alchemy.types.guid.GUID(length=16), nullable=False),
    sa.Column('form_id', advanced_alchemy.types.guid.GUID(length=16), nullable=False),
    sa.Column('raw_fields', sa.JSON(), nullable=False),
    sa.Column('raw_source_ref', sa.Text(), nullable=True),
    sa.Column('raw_text_hash', sa.String(length=64), nullable=False),
    sa.Column('source_type', sa.String(length=20), nullable=False),
    sa.Column('sa_orm_sentinel', sa.Integer(), nullable=True),
    sa.Column('created_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.Column('updated_at', advanced_alchemy.types.datetime.DateTimeUTC(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['form_id'], ['forms.id'], name=op.f('fk_form_details_form_id_forms')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_form_details')),
    sa.UniqueConstraint('form_id', name=op.f('uq_form_details_form_id'))
    )

    with op.batch_alter_table('forms', schema=None) as batch_op:
        batch_op.create_foreign_key('fk_forms_accepted_parse_attempt_id', 'form_parse_attempts', ['accepted_parse_attempt_id'], ['id'], use_alter=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('forms', schema=None) as batch_op:
        batch_op.drop_constraint('fk_forms_accepted_parse_attempt_id', type_='foreignkey')

    op.drop_table('form_details')
    op.drop_table('form_parse_attempts')
    with op.batch_alter_table('forms', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_forms_voyage_id'))
        batch_op.drop_index(batch_op.f('ix_forms_status'))
        batch_op.drop_index(batch_op.f('ix_forms_port_call_id'))

    op.drop_table('forms')
