"""remove_is_pinned_field_from_scripts

Revision ID: 8b0c30528220
Revises: 841854d3dd9b
Create Date: 2025-08-07 11:53:30.097035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b0c30528220'
down_revision: Union[str, Sequence[str], None] = '841854d3dd9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove is_pinned field from scriptsTable."""
    # Drop the is_pinned column from scriptsTable
    op.drop_column('scriptsTable', 'is_pinned')


def downgrade() -> None:
    """Re-add is_pinned field to scriptsTable."""
    # Add back the is_pinned column in case we need to rollback
    op.add_column('scriptsTable', sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')))
