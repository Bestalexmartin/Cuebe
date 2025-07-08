"""Enable uuid-ossp extension

Revision ID: e29d22d23d50
Revises: 
Create Date: 2025-07-07 21:49:25.502700

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e29d22d23d50'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')


def downgrade() -> None:
    """Downgrade schema."""
    pass
