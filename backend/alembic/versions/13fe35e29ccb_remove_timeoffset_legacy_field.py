# backend/alembic/versions/13fe35e29ccb_remove_timeoffset_legacy_field.py

"""remove_timeoffset_legacy_field

Revision ID: 13fe35e29ccb
Revises: 3845c61a05aa
Create Date: 2025-07-28 01:55:34.903743

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13fe35e29ccb'
down_revision: Union[str, Sequence[str], None] = '3845c61a05aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove legacy timeOffset field and its index from scriptElementsTable."""
    # First drop the index that references timeOffset
    op.drop_index('idx_scriptelement_timeoffset', table_name='scriptElementsTable')
    
    # Then drop the timeOffset column
    op.drop_column('scriptElementsTable', 'timeOffset')


def downgrade() -> None:
    """Re-add legacy timeOffset field and its index to scriptElementsTable."""
    # Add back the timeOffset column as nullable Interval
    op.add_column('scriptElementsTable', 
                  sa.Column('timeOffset', sa.Interval(), nullable=True))
    
    # Populate the timeOffset field from timeOffsetMs for existing records
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "timeOffset" = INTERVAL '1 millisecond' * "timeOffsetMs"
        WHERE "timeOffsetMs" IS NOT NULL
    """)
    
    # Recreate the index
    op.create_index('idx_scriptelement_timeoffset', 'scriptElementsTable', ['timeOffset'])
