"""Merge migration heads

Revision ID: f481c006b1a0
Revises: 20250820_000000, 640cf4f85a4a
Create Date: 2025-08-20 07:09:51.178685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f481c006b1a0'
down_revision: Union[str, Sequence[str], None] = ('20250820_000000', '640cf4f85a4a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
