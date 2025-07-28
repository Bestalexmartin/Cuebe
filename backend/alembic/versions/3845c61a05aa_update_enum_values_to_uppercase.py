"""update_enum_values_to_uppercase

Revision ID: 3845c61a05aa
Revises: 46cb873d6075
Create Date: 2025-07-27 16:22:31.190126

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3845c61a05aa'
down_revision: Union[str, Sequence[str], None] = '46cb873d6075'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema by converting enum values to uppercase."""
    
    # First, we need to temporarily remove the enum constraint and add the new values
    # Then update the data and recreate the constraint
    
    # Add new uppercase enum values to existing enum types
    op.execute("ALTER TYPE elementtype ADD VALUE IF NOT EXISTS 'CUE'")
    op.execute("ALTER TYPE elementtype ADD VALUE IF NOT EXISTS 'NOTE'")
    op.execute("ALTER TYPE elementtype ADD VALUE IF NOT EXISTS 'GROUP'")
    
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'MANUAL'")
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'TIME'")
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'AUTO'")
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'FOLLOW'")
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'GO'")
    op.execute("ALTER TYPE triggertype ADD VALUE IF NOT EXISTS 'STANDBY'")
    
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'PENDING'")
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'READY'")
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'EXECUTING'")
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'COMPLETED'")
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'SKIPPED'")
    op.execute("ALTER TYPE executionstatus ADD VALUE IF NOT EXISTS 'FAILED'")
    
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'CRITICAL'")
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'HIGH'")
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'NORMAL'")
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'LOW'")
    op.execute("ALTER TYPE prioritylevel ADD VALUE IF NOT EXISTS 'OPTIONAL'")
    
    # Now update the data using CASE statements with text casting
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "elementType" = (CASE 
            WHEN "elementType"::text = 'cue' THEN 'CUE'
            WHEN "elementType"::text = 'note' THEN 'NOTE'
            WHEN "elementType"::text = 'group' THEN 'GROUP'
            ELSE "elementType"::text
        END)::elementtype
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "triggerType" = (CASE 
            WHEN "triggerType"::text = 'manual' THEN 'MANUAL'
            WHEN "triggerType"::text = 'time' THEN 'TIME'
            WHEN "triggerType"::text = 'auto' THEN 'AUTO'
            WHEN "triggerType"::text = 'follow' THEN 'FOLLOW'
            WHEN "triggerType"::text = 'go' THEN 'GO'
            WHEN "triggerType"::text = 'standby' THEN 'STANDBY'
            ELSE "triggerType"::text
        END)::triggertype
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "executionStatus" = (CASE 
            WHEN "executionStatus"::text = 'pending' THEN 'PENDING'
            WHEN "executionStatus"::text = 'ready' THEN 'READY'
            WHEN "executionStatus"::text = 'executing' THEN 'EXECUTING'
            WHEN "executionStatus"::text = 'completed' THEN 'COMPLETED'
            WHEN "executionStatus"::text = 'skipped' THEN 'SKIPPED'
            WHEN "executionStatus"::text = 'failed' THEN 'FAILED'
            ELSE "executionStatus"::text
        END)::executionstatus
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "priority" = (CASE 
            WHEN "priority"::text = 'critical' THEN 'CRITICAL'
            WHEN "priority"::text = 'high' THEN 'HIGH'
            WHEN "priority"::text = 'normal' THEN 'NORMAL'
            WHEN "priority"::text = 'low' THEN 'LOW'
            WHEN "priority"::text = 'optional' THEN 'OPTIONAL'
            ELSE "priority"::text
        END)::prioritylevel
    """)


def downgrade() -> None:
    """Downgrade schema by converting enum values back to lowercase."""
    
    # Update the data back to lowercase using CASE statements with text casting
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "elementType" = (CASE 
            WHEN "elementType"::text = 'CUE' THEN 'cue'
            WHEN "elementType"::text = 'NOTE' THEN 'note'
            WHEN "elementType"::text = 'GROUP' THEN 'group'
            ELSE "elementType"::text
        END)::elementtype
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "triggerType" = (CASE 
            WHEN "triggerType"::text = 'MANUAL' THEN 'manual'
            WHEN "triggerType"::text = 'TIME' THEN 'time'
            WHEN "triggerType"::text = 'AUTO' THEN 'auto'
            WHEN "triggerType"::text = 'FOLLOW' THEN 'follow'
            WHEN "triggerType"::text = 'GO' THEN 'go'
            WHEN "triggerType"::text = 'STANDBY' THEN 'standby'
            ELSE "triggerType"::text
        END)::triggertype
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "executionStatus" = (CASE 
            WHEN "executionStatus"::text = 'PENDING' THEN 'pending'
            WHEN "executionStatus"::text = 'READY' THEN 'ready'
            WHEN "executionStatus"::text = 'EXECUTING' THEN 'executing'
            WHEN "executionStatus"::text = 'COMPLETED' THEN 'completed'
            WHEN "executionStatus"::text = 'SKIPPED' THEN 'skipped'
            WHEN "executionStatus"::text = 'FAILED' THEN 'failed'
            ELSE "executionStatus"::text
        END)::executionstatus
    """)
    
    op.execute("""
        UPDATE "scriptElementsTable" 
        SET "priority" = (CASE 
            WHEN "priority"::text = 'CRITICAL' THEN 'critical'
            WHEN "priority"::text = 'HIGH' THEN 'high'
            WHEN "priority"::text = 'NORMAL' THEN 'normal'
            WHEN "priority"::text = 'LOW' THEN 'low'
            WHEN "priority"::text = 'OPTIONAL' THEN 'optional'
            ELSE "priority"::text
        END)::prioritylevel
    """)
