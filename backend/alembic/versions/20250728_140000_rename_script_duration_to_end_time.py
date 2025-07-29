"""Rename scriptDuration to endTime

Revision ID: 20250728_140000
Revises: 20250728_130000
Create Date: 2025-07-28 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20250728_140000'
down_revision = '20250728_130000'
branch_labels = None
depends_on = None

def upgrade():
    # Check if scriptDuration column exists and rename it to endTime
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('scriptsTable')]
    
    if 'scriptDuration' in columns:
        # Rename scriptDuration to endTime
        op.alter_column('scriptsTable', 'scriptDuration', new_column_name='endTime')
    elif 'endTime' not in columns:
        # If neither exists, add endTime column
        op.add_column('scriptsTable', sa.Column('endTime', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    # Rename endTime back to scriptDuration
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('scriptsTable')]
    
    if 'endTime' in columns:
        op.alter_column('scriptsTable', 'endTime', new_column_name='scriptDuration')