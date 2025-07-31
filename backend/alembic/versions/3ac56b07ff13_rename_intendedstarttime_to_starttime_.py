# backend/alembic/versions/3ac56b07ff13_rename_intendedstarttime_to_starttime_.py

"""rename intendedStartTime to startTime in scripts table

Revision ID: 3ac56b07ff13
Revises: 75129b293431
Create Date: 2025-07-19 18:02:44.258101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '3ac56b07ff13'
down_revision: Union[str, Sequence[str], None] = '75129b293431'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Rename the column from intendedStartTime to startTime
    op.execute('ALTER TABLE "scriptsTable" RENAME COLUMN "intendedStartTime" TO "startTime"')

def downgrade() -> None:
    # Rename back from startTime to intendedStartTime
    op.execute('ALTER TABLE "scriptsTable" RENAME COLUMN "startTime" TO "intendedStartTime"')