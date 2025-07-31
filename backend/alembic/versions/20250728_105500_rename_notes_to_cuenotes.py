# backend/alembic/versions/20250728_105500_rename_notes_to_cuenotes.py

"""Rename notes field to cueNotes in script_elements table

Revision ID: rename_notes_to_cuenotes
Revises: 3845c61a05aa
Create Date: 2025-07-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250728_105500'
down_revision = '13fe35e29ccb'
branch_labels = None
depends_on = None

def upgrade():
    # Rename the notes column to cueNotes
    with op.batch_alter_table('scriptElementsTable', schema=None) as batch_op:
        batch_op.alter_column('notes', new_column_name='cueNotes')

def downgrade():
    # Revert the column name back to notes
    with op.batch_alter_table('scriptElementsTable', schema=None) as batch_op:
        batch_op.alter_column('cueNotes', new_column_name='notes')