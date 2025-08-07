"""add_is_shared_field_to_scripts

Revision ID: 841854d3dd9b
Revises: bb1001
Create Date: 2025-08-07 03:35:02.509476

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '841854d3dd9b'
down_revision: Union[str, Sequence[str], None] = 'bb1001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add is_shared column to scriptsTable."""
    # Add the is_shared column with default value of False
    op.add_column('scriptsTable', sa.Column('is_shared', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade() -> None:
    """Remove is_shared column from scriptsTable."""
    # Remove the is_shared column
    op.drop_column('scriptsTable', 'is_shared')
