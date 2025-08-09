"""fix remove unused fields migration

Remove the 12 unused script element fields, skipping any indexes that don't exist.

Revision ID: d04d1e3b924b
Revises: b9124910c926
Create Date: 2025-08-08 12:25:26.410544

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd04d1e3b924b'
down_revision: Union[str, Sequence[str], None] = 'b9124910c926'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove unused fields from scriptElementsTable, ignoring missing indexes."""
    
    # Try to drop indexes if they exist, but don't fail if they don't
    try:
        op.execute("DROP INDEX IF EXISTS idx_type_active")
    except Exception:
        pass
        
    try:
        op.execute("DROP INDEX IF EXISTS idx_cue_number") 
    except Exception:
        pass
    
    # Remove the 12 unused columns (only if they exist)
    columns_to_drop = [
        'fade_in', 'fade_out', 'cue_number', 'cue_id', 'element_description',
        'follows_cue_id', 'location', 'department_color', 'version', 'is_active', 
        'execution_status', 'trigger_type'
    ]
    
    for column in columns_to_drop:
        try:
            op.drop_column('scriptElementsTable', column)
        except Exception as e:
            print(f"Column {column} doesn't exist or already dropped: {e}")
            pass


def downgrade() -> None:
    """Not recommended - these fields were unused phantom functionality."""
    pass
