# backend/alembic/versions/d0e03c67e91c_add_useroptions_column_to_users_table.py

"""Add userOptions column to users table

Revision ID: d0e03c67e91c
Revises: 6f2839d0e48c
Create Date: 2025-07-30 00:04:20.458654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0e03c67e91c'
down_revision: Union[str, Sequence[str], None] = '6f2839d0e48c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add userOptions column as JSON, nullable
    op.add_column('userTable', sa.Column('userOptions', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove userOptions column
    op.drop_column('userTable', 'userOptions')
