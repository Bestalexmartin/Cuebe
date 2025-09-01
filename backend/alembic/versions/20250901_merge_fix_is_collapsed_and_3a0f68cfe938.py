"""
Merge heads: fix_is_collapsed_default_20250901 and 3a0f68cfe938

This merge migration resolves multiple heads by converging the two
independent lineages into a single head.

Revision ID: merge_fix_is_collapsed_3a0f68_20250901
Revises: fix_is_collapsed_default_20250901, 3a0f68cfe938
Create Date: 2025-09-01
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_fix_is_collapsed_3a0f68_20250901'
down_revision = ('fix_is_collapsed_default_20250901', '3a0f68cfe938')
branch_labels = None
depends_on = None


def upgrade():
    # This is a merge-only migration; no schema changes are required.
    pass


def downgrade():
    # This is a merge-only migration; nothing to downgrade here.
    pass

