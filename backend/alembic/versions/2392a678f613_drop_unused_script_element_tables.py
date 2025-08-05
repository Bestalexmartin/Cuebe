"""drop_unused_script_element_tables

Revision ID: 2392a678f613
Revises: 14484fe66729
Create Date: 2025-08-04 23:02:15.589500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2392a678f613'
down_revision: Union[str, Sequence[str], None] = '14484fe66729'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop unused script element supporting tables."""
    # Drop tables in reverse dependency order
    op.drop_table('scriptElementConditionalRules')
    op.drop_table('scriptElementPerformerAssignments') 
    op.drop_table('scriptElementCrewAssignments')
    op.drop_table('scriptElementEquipment')
    op.drop_table('scriptElementGroups')


def downgrade() -> None:
    """Recreate the dropped tables (simplified structure for rollback)."""
    # Note: This is a simplified recreation - full structure would be complex
    # Since these tables were unused, a simple structure is sufficient for rollback
    
    # scriptElementEquipment
    op.create_table('scriptElementEquipment',
        sa.Column('element_id', sa.UUID(), nullable=False),
        sa.Column('equipment_name', sa.String(100), nullable=False),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('element_id', 'equipment_name'),
        sa.ForeignKeyConstraint(['element_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE')
    )
    
    # scriptElementCrewAssignments  
    op.create_table('scriptElementCrewAssignments',
        sa.Column('element_id', sa.UUID(), nullable=False),
        sa.Column('crew_id', sa.UUID(), nullable=False),
        sa.Column('assignment_role', sa.String(100), nullable=True),
        sa.Column('is_lead', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('element_id', 'crew_id'),
        sa.ForeignKeyConstraint(['element_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE')
    )
    
    # scriptElementPerformerAssignments
    op.create_table('scriptElementPerformerAssignments',
        sa.Column('element_id', sa.UUID(), nullable=False),
        sa.Column('performer_id', sa.UUID(), nullable=False),
        sa.Column('character_name', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('element_id', 'performer_id'),
        sa.ForeignKeyConstraint(['element_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE')
    )
    
    # scriptElementConditionalRules
    op.create_table('scriptElementConditionalRules',
        sa.Column('rule_id', sa.UUID(), nullable=False),
        sa.Column('element_id', sa.UUID(), nullable=False),
        sa.Column('condition_type', sa.Enum('weather', 'cast', 'equipment', 'time', 'custom', name='conditiontype'), nullable=False),
        sa.Column('operator', sa.Enum('equals', 'not_equals', 'contains', 'greater_than', 'less_than', name='operatortype'), nullable=False),
        sa.Column('condition_value', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.PrimaryKeyConstraint('rule_id'),
        sa.ForeignKeyConstraint(['element_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE')
    )
    
    # scriptElementGroups
    op.create_table('scriptElementGroups',
        sa.Column('group_id', sa.UUID(), nullable=False),
        sa.Column('child_element_id', sa.UUID(), nullable=False),
        sa.Column('order_in_group', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('group_id', 'child_element_id'),
        sa.ForeignKeyConstraint(['group_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['child_element_id'], ['scriptElementsTable.element_id'], ondelete='CASCADE')
    )
