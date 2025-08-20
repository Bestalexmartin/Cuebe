"""Add IMPORTED status to ScriptStatus enum

Revision ID: 20250820_000000
Revises: ebde897f9744
Create Date: 2025-08-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20250820_000000'
down_revision: Union[str, Sequence[str], None] = 'ebde897f9744'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add IMPORTED to the existing scriptstatus enum
    op.execute("ALTER TYPE scriptstatus ADD VALUE 'IMPORTED'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type and migrating data
    # For now, we'll leave the IMPORTED value in place
    pass