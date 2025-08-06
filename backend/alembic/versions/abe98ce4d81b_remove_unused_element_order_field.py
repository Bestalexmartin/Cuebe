"""remove_unused_element_order_field

Revision ID: abe98ce4d81b
Revises: 2392a678f613
Create Date: 2025-08-06 02:17:20.046049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abe98ce4d81b'
down_revision: Union[str, Sequence[str], None] = '2392a678f613'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove unused element_order column and its index."""
    # Drop the index first
    op.drop_index('idx_scriptelement_script_order', table_name='scriptElementsTable')
    
    # Drop the element_order column
    op.drop_column('scriptElementsTable', 'element_order')


def downgrade() -> None:
    """Add back the element_order column and index (for rollback)."""
    # Add the element_order column back
    op.add_column('scriptElementsTable', sa.Column('element_order', sa.Integer(), nullable=True))
    
    # Recreate the index
    op.create_index('idx_scriptelement_script_order', 'scriptElementsTable', ['script_id', 'element_order'])
