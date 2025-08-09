"""merge heads before field rename

Revision ID: 66c8be99acab
Revises: d04d1e3b924b, rename_show_duration_to_show_end
Create Date: 2025-08-09 17:08:25.106873

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66c8be99acab'
down_revision: Union[str, Sequence[str], None] = ('d04d1e3b924b', 'rename_show_duration_to_show_end')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
