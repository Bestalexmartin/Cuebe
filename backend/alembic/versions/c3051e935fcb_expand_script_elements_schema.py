"""expand_script_elements_schema

Revision ID: c3051e935fcb
Revises: d13d8bc53a59
Create Date: 2025-07-26 22:36:27.768654

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'c3051e935fcb'
down_revision: Union[str, Sequence[str], None] = 'd13d8bc53a59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Expand script elements schema with comprehensive theater features."""
    
    # First, let's add the new enum types
    op.execute("CREATE TYPE triggertype AS ENUM ('manual', 'time', 'auto', 'follow', 'go', 'standby')")
    op.execute("CREATE TYPE executionstatus AS ENUM ('pending', 'ready', 'executing', 'completed', 'skipped', 'failed')")
    op.execute("CREATE TYPE prioritylevel AS ENUM ('critical', 'high', 'normal', 'low', 'optional')")
    op.execute("CREATE TYPE locationarea AS ENUM ('stage_left', 'stage_right', 'center_stage', 'upstage', 'downstage', 'stage_left_up', 'stage_right_up', 'stage_left_down', 'stage_right_down', 'fly_gallery', 'booth', 'house', 'backstage', 'wings_left', 'wings_right', 'grid', 'trap', 'pit', 'lobby', 'dressing_room', 'other')")
    
    # Update the ElementType enum to match our new design
    op.execute("ALTER TYPE elementtype ADD VALUE 'group'")
    
    # Add new columns to scriptElementsTable
    op.add_column('scriptElementsTable', sa.Column('sequence', sa.Integer(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('triggerType', sa.Enum('manual', 'time', 'auto', 'follow', 'go', 'standby', name='triggertype'), nullable=False, server_default='manual'))
    op.add_column('scriptElementsTable', sa.Column('followsCueID', sa.String(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('cueID', sa.String(50), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('description', sa.Text(), nullable=False, server_default=''))
    op.add_column('scriptElementsTable', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('departmentColor', sa.String(7), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('customColor', sa.String(7), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('location', sa.Enum('stage_left', 'stage_right', 'center_stage', 'upstage', 'downstage', 'stage_left_up', 'stage_right_up', 'stage_left_down', 'stage_right_down', 'fly_gallery', 'booth', 'house', 'backstage', 'wings_left', 'wings_right', 'grid', 'trap', 'pit', 'lobby', 'dressing_room', 'other', name='locationarea'), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('locationDetails', sa.Text(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('duration', sa.Integer(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('fadeIn', sa.Integer(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('fadeOut', sa.Integer(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('priority', sa.Enum('critical', 'high', 'normal', 'low', 'optional', name='prioritylevel'), nullable=False, server_default='normal'))
    op.add_column('scriptElementsTable', sa.Column('executionStatus', sa.Enum('pending', 'ready', 'executing', 'completed', 'skipped', 'failed', name='executionstatus'), nullable=False, server_default='pending'))
    op.add_column('scriptElementsTable', sa.Column('parentElementID', UUID(as_uuid=True), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('groupLevel', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('scriptElementsTable', sa.Column('isCollapsed', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('scriptElementsTable', sa.Column('isSafetyCritical', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('scriptElementsTable', sa.Column('safetyNotes', sa.Text(), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('createdBy', UUID(as_uuid=True), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('updatedBy', UUID(as_uuid=True), nullable=True))
    op.add_column('scriptElementsTable', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # Update timeOffset to be integer (milliseconds) instead of Interval
    op.add_column('scriptElementsTable', sa.Column('timeOffsetMs', sa.Integer(), nullable=False, server_default='0'))
    
    # Make departmentID nullable (since notes don't require departments)
    op.alter_column('scriptElementsTable', 'departmentID', nullable=True)
    
    # Add foreign key constraint for parentElementID
    op.create_foreign_key('fk_script_element_parent', 'scriptElementsTable', 'scriptElementsTable', ['parentElementID'], ['elementID'])
    
    # Create new supporting tables
    
    # Equipment requirements table
    op.create_table('scriptElementEquipment',
        sa.Column('elementID', UUID(as_uuid=True), nullable=False),
        sa.Column('equipmentName', sa.String(100), nullable=False),
        sa.Column('isRequired', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['elementID'], ['scriptElementsTable.elementID'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('elementID', 'equipmentName')
    )
    
    # Crew assignments table
    op.create_table('scriptElementCrewAssignments',
        sa.Column('elementID', UUID(as_uuid=True), nullable=False),
        sa.Column('crewID', UUID(as_uuid=True), nullable=False),
        sa.Column('assignmentRole', sa.String(100), nullable=True),
        sa.Column('isLead', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.ForeignKeyConstraint(['elementID'], ['scriptElementsTable.elementID'], ondelete='CASCADE'),
        # Note: crewID FK would be added when crew table exists
        sa.PrimaryKeyConstraint('elementID', 'crewID')
    )
    
    # Performer assignments table
    op.create_table('scriptElementPerformerAssignments',
        sa.Column('elementID', UUID(as_uuid=True), nullable=False),
        sa.Column('performerID', UUID(as_uuid=True), nullable=False),
        sa.Column('characterName', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['elementID'], ['scriptElementsTable.elementID'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('elementID', 'performerID')
    )
    
    # Conditional rules table
    op.create_table('scriptElementConditionalRules',
        sa.Column('ruleID', UUID(as_uuid=True), primary_key=True),
        sa.Column('elementID', UUID(as_uuid=True), nullable=False),
        sa.Column('conditionType', sa.Enum('weather', 'cast', 'equipment', 'time', 'custom', name='conditiontype'), nullable=False),
        sa.Column('operator', sa.Enum('equals', 'not_equals', 'contains', 'greater_than', 'less_than', name='operatortype'), nullable=False),
        sa.Column('conditionValue', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('isActive', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['elementID'], ['scriptElementsTable.elementID'], ondelete='CASCADE')
    )
    
    # Group relationships table
    op.create_table('scriptElementGroups',
        sa.Column('groupID', UUID(as_uuid=True), nullable=False),
        sa.Column('childElementID', UUID(as_uuid=True), nullable=False),
        sa.Column('orderInGroup', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['groupID'], ['scriptElementsTable.elementID'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['childElementID'], ['scriptElementsTable.elementID'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('groupID', 'childElementID')
    )
    
    # Add new columns to departmentsTable
    op.add_column('departmentsTable', sa.Column('shortName', sa.String(10), nullable=True))
    op.add_column('departmentsTable', sa.Column('color', sa.String(7), nullable=True, server_default='#6495ED'))
    op.add_column('departmentsTable', sa.Column('description', sa.Text(), nullable=True))
    
    # Add indexes for performance
    op.create_index('idx_script_sequence', 'scriptElementsTable', ['scriptID', 'sequence'])
    op.create_index('idx_script_time_ms', 'scriptElementsTable', ['scriptID', 'timeOffsetMs'])
    op.create_index('idx_department_elements', 'scriptElementsTable', ['departmentID'])
    op.create_index('idx_parent_element', 'scriptElementsTable', ['parentElementID'])
    op.create_index('idx_cue_id', 'scriptElementsTable', ['cueID'])
    op.create_index('idx_type_active', 'scriptElementsTable', ['elementType', 'isActive'])
    op.create_index('idx_element_conditions', 'scriptElementConditionalRules', ['elementID'])
    op.create_index('idx_group_order', 'scriptElementGroups', ['groupID', 'orderInGroup'])
    op.create_index('idx_dept_short_name', 'departmentsTable', ['shortName'])
    
    # Update existing data - populate sequence from elementOrder and convert timeOffset
    # Only run these updates if the table has existing data
    try:
        # Check if table has any rows before attempting updates
        connection = op.get_bind()
        result = connection.execute(sa.text('SELECT COUNT(*) FROM "scriptElementsTable"'))
        row_count = result.scalar()
        
        if row_count > 0:
            op.execute('UPDATE "scriptElementsTable" SET sequence = "elementOrder" WHERE "elementOrder" IS NOT NULL')
            op.execute('UPDATE "scriptElementsTable" SET "timeOffsetMs" = EXTRACT(EPOCH FROM "timeOffset") * 1000 WHERE "timeOffset" IS NOT NULL')
            op.execute('UPDATE "scriptElementsTable" SET description = COALESCE("elementDescription", \'\') WHERE "elementDescription" IS NOT NULL')
            op.execute('UPDATE "scriptElementsTable" SET "cueID" = "cueNumber" WHERE "cueNumber" IS NOT NULL')
    except Exception:
        # If the table doesn't exist or columns don't exist, skip the data migration
        # This is expected for fresh installations
        pass


def downgrade() -> None:
    """Downgrade schema - remove script elements expansion."""
    
    # Drop indexes
    op.drop_index('idx_dept_short_name', 'departmentsTable')
    op.drop_index('idx_group_order', 'scriptElementGroups')
    op.drop_index('idx_element_conditions', 'scriptElementConditionalRules')
    op.drop_index('idx_type_active', 'scriptElementsTable')
    op.drop_index('idx_cue_id', 'scriptElementsTable')
    op.drop_index('idx_parent_element', 'scriptElementsTable')
    op.drop_index('idx_department_elements', 'scriptElementsTable')
    op.drop_index('idx_script_time_ms', 'scriptElementsTable')
    op.drop_index('idx_script_sequence', 'scriptElementsTable')
    
    # Drop new tables
    op.drop_table('scriptElementGroups')
    op.drop_table('scriptElementConditionalRules')
    op.drop_table('scriptElementPerformerAssignments')
    op.drop_table('scriptElementCrewAssignments')
    op.drop_table('scriptElementEquipment')
    
    # Remove columns from departmentsTable
    op.drop_column('departmentsTable', 'description')
    op.drop_column('departmentsTable', 'color')
    op.drop_column('departmentsTable', 'shortName')
    
    # Remove foreign key constraint
    op.drop_constraint('fk_script_element_parent', 'scriptElementsTable', type_='foreignkey')
    
    # Remove columns from scriptElementsTable
    op.drop_column('scriptElementsTable', 'version')
    op.drop_column('scriptElementsTable', 'updatedBy')
    op.drop_column('scriptElementsTable', 'createdBy')
    op.drop_column('scriptElementsTable', 'safetyNotes')
    op.drop_column('scriptElementsTable', 'isSafetyCritical')
    op.drop_column('scriptElementsTable', 'isCollapsed')
    op.drop_column('scriptElementsTable', 'groupLevel')
    op.drop_column('scriptElementsTable', 'parentElementID')
    op.drop_column('scriptElementsTable', 'executionStatus')
    op.drop_column('scriptElementsTable', 'priority')
    op.drop_column('scriptElementsTable', 'fadeOut')
    op.drop_column('scriptElementsTable', 'fadeIn')
    op.drop_column('scriptElementsTable', 'duration')
    op.drop_column('scriptElementsTable', 'locationDetails')
    op.drop_column('scriptElementsTable', 'location')
    op.drop_column('scriptElementsTable', 'customColor')
    op.drop_column('scriptElementsTable', 'departmentColor')
    op.drop_column('scriptElementsTable', 'notes')
    op.drop_column('scriptElementsTable', 'description')
    op.drop_column('scriptElementsTable', 'cueID')
    op.drop_column('scriptElementsTable', 'followsCueID')
    op.drop_column('scriptElementsTable', 'triggerType')
    op.drop_column('scriptElementsTable', 'sequence')
    op.drop_column('scriptElementsTable', 'timeOffsetMs')
    
    # Restore departmentID as not nullable
    op.alter_column('scriptElementsTable', 'departmentID', nullable=False)
    
    # Drop the new enum types
    op.execute("DROP TYPE IF EXISTS conditiontype")
    op.execute("DROP TYPE IF EXISTS operatortype")
    op.execute("DROP TYPE IF EXISTS locationarea")
    op.execute("DROP TYPE IF EXISTS prioritylevel")
    op.execute("DROP TYPE IF EXISTS executionstatus")
    op.execute("DROP TYPE IF EXISTS triggertype")
