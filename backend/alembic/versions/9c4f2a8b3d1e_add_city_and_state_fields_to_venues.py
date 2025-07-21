"""add city and state fields to venues

Revision ID: 9c4f2a8b3d1e
Revises: 82d5dcfd01e5
Create Date: 2025-07-20 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4f2a8b3d1e'
down_revision: Union[str, Sequence[str], None] = '82d5dcfd01e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add city and state fields to venues table."""
    
    # Add city column to venuesTable
    op.add_column('venuesTable', sa.Column('city', sa.String(), nullable=True))
    
    # Add state column to venuesTable
    op.add_column('venuesTable', sa.Column('state', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove city and state fields from venues table."""
    
    # Drop state column from venuesTable
    op.drop_column('venuesTable', 'state')
    
    # Drop city column from venuesTable
    op.drop_column('venuesTable', 'city')