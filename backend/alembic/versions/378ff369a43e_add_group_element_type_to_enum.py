"""add_group_element_type_to_enum

Revision ID: 378ff369a43e
Revises: abe98ce4d81b
Create Date: 2025-08-06 03:04:47.291570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '378ff369a43e'
down_revision: Union[str, Sequence[str], None] = 'abe98ce4d81b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add GROUP to elementtype enum."""
    # Add GROUP to the existing elementtype enum
    op.execute("ALTER TYPE elementtype ADD VALUE 'GROUP'")


def downgrade() -> None:
    """Remove GROUP from elementtype enum."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum, which is complex
    # For now, we'll leave the GROUP value in the enum
    pass
