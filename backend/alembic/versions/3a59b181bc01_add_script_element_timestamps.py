"""add_script_element_timestamps

Revision ID: 3a59b181bc01
Revises: c3051e935fcb
Create Date: 2025-07-27 03:02:26.892838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a59b181bc01'
down_revision: Union[str, Sequence[str], None] = 'c3051e935fcb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add dateCreated and dateUpdated columns to scriptElementsTable"""
    # Add timestamp columns
    op.add_column('scriptElementsTable', sa.Column('dateCreated', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column('scriptElementsTable', sa.Column('dateUpdated', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    """Remove timestamp columns from scriptElementsTable"""
    op.drop_column('scriptElementsTable', 'dateUpdated')
    op.drop_column('scriptElementsTable', 'dateCreated')
