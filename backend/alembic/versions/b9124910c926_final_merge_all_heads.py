"""final merge all heads

Revision ID: b9124910c926
Revises: 36a7d8ac7264, rename_show_duration_to_show_end
Create Date: 2025-08-08 12:23:59.110203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b9124910c926'
down_revision: Union[str, Sequence[str], None] = ('36a7d8ac7264', 'rename_show_duration_to_show_end')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
