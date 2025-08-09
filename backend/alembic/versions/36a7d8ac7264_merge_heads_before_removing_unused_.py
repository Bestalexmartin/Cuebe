"""merge heads before removing unused fields

Revision ID: 36a7d8ac7264
Revises: 20250108_220000, 8b0c30528220
Create Date: 2025-08-08 12:23:24.679574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '36a7d8ac7264'
down_revision: Union[str, Sequence[str], None] = ('20250108_220000', '8b0c30528220')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
