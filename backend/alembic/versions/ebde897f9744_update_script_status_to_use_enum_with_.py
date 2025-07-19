"""update script status to use enum with draft default

Revision ID: ebde897f9744
Revises: 3ac56b07ff13
Create Date: 2025-07-19 19:01:07.525738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision: str = 'ebde897f9744'
down_revision: Union[str, Sequence[str], None] = '3ac56b07ff13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Create the enum type with UPPERCASE values (matching enum names)
    op.execute("CREATE TYPE scriptstatus AS ENUM ('DRAFT', 'COPY', 'WORKING', 'FINAL', 'BACKUP')")
    
    # Update existing records to use 'DRAFT' instead of old values
    op.execute('UPDATE "scriptsTable" SET "scriptStatus" = \'DRAFT\' WHERE "scriptStatus" IN (\'ready\', \'running\', \'paused\', \'done\')')
    
    # Alter the column to use the enum with explicit casting
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" TYPE scriptstatus USING "scriptStatus"::scriptstatus')
    
    # Set the new default to uppercase
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" SET DEFAULT \'DRAFT\'')
    
    # Make it non-nullable
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" SET NOT NULL')
    
def downgrade() -> None:
    # Remove NOT NULL constraint
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" DROP NOT NULL')
    
    # Update records back to old values (approximate mapping)
    op.execute('UPDATE "scriptsTable" SET "scriptStatus" = \'ready\' WHERE "scriptStatus" = \'draft\'')
    
    # Revert column back to string type
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" TYPE VARCHAR')
    
    # Set old default
    op.execute('ALTER TABLE "scriptsTable" ALTER COLUMN "scriptStatus" SET DEFAULT \'ready\'')
    
    # Drop the enum type
    op.execute('DROP TYPE scriptstatus')