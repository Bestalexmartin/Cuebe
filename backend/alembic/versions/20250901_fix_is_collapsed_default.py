"""
Set default and non-null constraint for scriptElementsTable.is_collapsed and backfill NULLs

Revision ID: fix_is_collapsed_default_20250901
Revises: 
Create Date: 2025-09-01
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fix_is_collapsed_default_20250901'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Ensure default false
    op.execute('ALTER TABLE "scriptElementsTable" ALTER COLUMN is_collapsed SET DEFAULT false;')
    # Backfill NULLs to false
    op.execute('UPDATE "scriptElementsTable" SET is_collapsed = false WHERE is_collapsed IS NULL;')
    # Enforce NOT NULL
    op.execute('ALTER TABLE "scriptElementsTable" ALTER COLUMN is_collapsed SET NOT NULL;')


def downgrade():
    # Relax NOT NULL (if needed)
    op.execute('ALTER TABLE "scriptElementsTable" ALTER COLUMN is_collapsed DROP NOT NULL;')
    # Drop default
    op.execute('ALTER TABLE "scriptElementsTable" ALTER COLUMN is_collapsed DROP DEFAULT;')

