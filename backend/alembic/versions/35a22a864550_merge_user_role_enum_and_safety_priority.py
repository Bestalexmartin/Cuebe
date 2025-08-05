"""merge_user_role_enum_and_safety_priority

Revision ID: 35a22a864550
Revises: add_user_role_enum, b9d7171f4349
Create Date: 2025-08-04 22:08:58.734002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '35a22a864550'
down_revision: Union[str, Sequence[str], None] = ('add_user_role_enum', 'b9d7171f4349')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
