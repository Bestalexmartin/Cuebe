"""Remove GROUP from ElementType enum

Revision ID: 20250728_120000
Revises: rename_notes_to_cuenotes
Create Date: 2025-07-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250728_120000'
down_revision = '20250728_105500'
branch_labels = None
depends_on = None

def upgrade():
    # Create new enum type with only CUE and NOTE values
    op.execute("CREATE TYPE elementtype_new AS ENUM ('CUE', 'NOTE')")
    
    # Update the column to use the new enum type, casting any existing values
    op.execute("""
        ALTER TABLE "scriptElementsTable" 
        ALTER COLUMN "elementType" TYPE elementtype_new 
        USING CASE 
            WHEN "elementType"::text IN ('CUE', 'NOTE') THEN "elementType"::text::elementtype_new
            ELSE 'NOTE'::elementtype_new  -- Default any other values to NOTE
        END
    """)
    
    # Drop the old enum type and rename the new one
    op.execute("DROP TYPE elementtype")
    op.execute("ALTER TYPE elementtype_new RENAME TO elementtype")

def downgrade():
    # Recreate the old enum with all previous values
    op.execute("""
        CREATE TYPE elementtype_old AS ENUM (
            'CUE', 'NOTE', 'MARKER', 'STANDBY', 'WARNING', 'group', 'GROUP'
        )
    """)
    
    # Update the column back to the old enum type
    op.execute("""
        ALTER TABLE "scriptElementsTable" 
        ALTER COLUMN "elementType" TYPE elementtype_old 
        USING "elementType"::text::elementtype_old
    """)
    
    # Drop the current enum and rename the old one back
    op.execute("DROP TYPE elementtype")
    op.execute("ALTER TYPE elementtype_old RENAME TO elementtype")