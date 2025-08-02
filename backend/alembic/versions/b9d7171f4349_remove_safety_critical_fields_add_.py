"""remove_safety_critical_fields_add_safety_priority

Revision ID: b9d7171f4349
Revises: b287f1013c8e
Create Date: 2025-08-02 02:27:53.601504

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9d7171f4349'
down_revision: Union[str, Sequence[str], None] = 'b287f1013c8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add SAFETY priority level and remove safety critical fields."""
    # Add SAFETY value to PriorityLevel enum
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'SAFETY'")
    
    # Drop the safety critical columns from scriptElementsTable
    op.drop_column('scriptElementsTable', 'isSafetyCritical')
    op.drop_column('scriptElementsTable', 'safetyNotes')


def downgrade() -> None:
    """Re-add safety critical fields and remove SAFETY priority level."""
    # Note: PostgreSQL doesn't support removing enum values, so we leave SAFETY in the enum
    # but ensure existing SAFETY priority values are converted to CRITICAL
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "priority" = 'CRITICAL'
        WHERE "priority"::text = 'SAFETY'
    """)
    
    # Re-add the safety critical columns
    op.add_column('scriptElementsTable', 
                  sa.Column('isSafetyCritical', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('scriptElementsTable', 
                  sa.Column('safetyNotes', sa.Text(), nullable=True))
