"""Add showDuration and endTime fields

Revision ID: 20250728_130000
Revises: 20250728_120000
Create Date: 2025-07-28 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250728_130000'
down_revision = '20250728_120000'
branch_labels = None
depends_on = None

def upgrade():
    # Add showDuration field to showsTable (End Time)
    op.add_column('showsTable', sa.Column('showDuration', sa.DateTime(timezone=True), nullable=True))
    
    # Add endTime field to scriptsTable (Planned end time)
    op.add_column('scriptsTable', sa.Column('endTime', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    # Remove the duration fields
    op.drop_column('scriptsTable', 'endTime')
    op.drop_column('showsTable', 'showDuration')