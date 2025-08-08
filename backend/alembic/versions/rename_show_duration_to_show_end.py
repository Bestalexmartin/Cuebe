"""Rename show_duration to show_end for clarity

Revision ID: rename_show_duration_to_show_end
Revises: a2471fd11a8a
Create Date: 2025-08-07 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'rename_show_duration_to_show_end'
down_revision = 'a2471fd11a8a'
branch_labels = None
depends_on = None


def upgrade():
    # Rename show_duration column to show_end in the shows table
    op.alter_column('showsTable', 'show_duration', new_column_name='show_end')


def downgrade():
    # Rename show_end column back to show_duration in the shows table
    op.alter_column('showsTable', 'show_end', new_column_name='show_duration')