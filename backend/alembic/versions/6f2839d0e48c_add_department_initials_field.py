# backend/alembic/versions/6f2839d0e48c_add_department_initials_field.py

"""add department initials field

Revision ID: 6f2839d0e48c
Revises: 20250728_140000
Create Date: 2025-07-28 20:35:57.364122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f2839d0e48c'
down_revision: Union[str, Sequence[str], None] = '20250728_140000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add departmentInitials field to departments table."""
    op.add_column('departmentsTable', sa.Column('departmentInitials', sa.String(length=5), nullable=True))


def downgrade() -> None:
    """Remove departmentInitials field from departments table."""
    op.drop_column('departmentsTable', 'departmentInitials')
