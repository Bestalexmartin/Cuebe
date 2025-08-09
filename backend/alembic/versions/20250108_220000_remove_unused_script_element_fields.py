"""remove unused script element fields

Remove 12 unnecessary fields from scriptElementsTable that were added speculatively
but are not used in the current application:
- fade_in, fade_out (no UI or logic)
- cue_number, element_description (legacy, replaced by other fields)
- cue_id (unused, element_id is used instead)
- follows_cue_id (not implemented)
- location (unused, location_details is used instead)  
- department_color (unused, custom_color is used instead)
- version (pointless incrementing)
- is_active (fake soft-delete, scripts are hard-deleted)
- execution_status, trigger_type (unimplemented future features)

Revision ID: 20250108_220000
Revises: 841854d3dd9b
Create Date: 2025-01-08 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20250108_220000'
down_revision: Union[str, Sequence[str], None] = '841854d3dd9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Remove unused fields from scriptElementsTable."""
    
    # Drop indexes that reference these columns (if they exist)
    try:
        op.drop_index('idx_type_active', table_name='scriptElementsTable')
    except Exception:
        pass  # Index doesn't exist, continue
    
    try:
        op.drop_index('idx_cue_number', table_name='scriptElementsTable')
    except Exception:
        pass  # Index doesn't exist, continue
    
    # Remove the 12 unused columns
    op.drop_column('scriptElementsTable', 'fade_in')
    op.drop_column('scriptElementsTable', 'fade_out')
    op.drop_column('scriptElementsTable', 'cue_number')
    op.drop_column('scriptElementsTable', 'cue_id')
    op.drop_column('scriptElementsTable', 'element_description')
    op.drop_column('scriptElementsTable', 'follows_cue_id')
    op.drop_column('scriptElementsTable', 'location')
    op.drop_column('scriptElementsTable', 'department_color')
    op.drop_column('scriptElementsTable', 'version')
    op.drop_column('scriptElementsTable', 'is_active')
    op.drop_column('scriptElementsTable', 'execution_status')
    op.drop_column('scriptElementsTable', 'trigger_type')

def downgrade() -> None:
    """Re-add the removed columns (not recommended - these fields were unused)."""
    
    # Re-create the columns with their original types
    op.add_column('scriptElementsTable', sa.Column('fade_in', sa.NUMERIC(precision=5, scale=2), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('fade_out', sa.NUMERIC(precision=5, scale=2), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('cue_number', sa.VARCHAR(length=50), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('cue_id', sa.VARCHAR(length=50), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('element_description', sa.TEXT(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('follows_cue_id', sa.UUID(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('location', postgresql.ENUM('STAGE', 'BOOTH', 'BACKSTAGE', 'FRONT_OF_HOUSE', 'OTHER', name='locationarea', create_type=False), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('department_color', sa.VARCHAR(length=7), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('version', sa.INTEGER(), nullable=False, server_default=sa.text('1')))
    op.add_column('scriptElementsTable', sa.Column('is_active', sa.BOOLEAN(), nullable=False, server_default=sa.text('true')))
    op.add_column('scriptElementsTable', sa.Column('execution_status', postgresql.ENUM('PENDING', 'READY', 'EXECUTING', 'COMPLETED', 'SKIPPED', 'FAILED', name='executionstatus', create_type=False), nullable=True, server_default=sa.text("'PENDING'")))
    op.add_column('scriptElementsTable', sa.Column('trigger_type', postgresql.ENUM('MANUAL', 'TIME', 'AUTO', 'FOLLOW', 'GO', 'STANDBY', name='triggertype', create_type=False), nullable=False, server_default=sa.text("'MANUAL'")))
    
    # Re-create indexes
    op.create_index('idx_cue_number', 'scriptElementsTable', ['cue_number'], unique=False)
    op.create_index('idx_type_active', 'scriptElementsTable', ['element_type', 'is_active'], unique=False)