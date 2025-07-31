# backend/alembic/versions/46cb873d6075_add_script_notes_field.py

"""add_script_notes_field

Revision ID: 46cb873d6075
Revises: 3a59b181bc01
Create Date: 2025-07-27 03:15:30.199607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46cb873d6075'
down_revision: Union[str, Sequence[str], None] = '3a59b181bc01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add scriptNotes column to scriptsTable and rename venue notes field."""
    # Add scriptNotes column to scriptsTable
    op.add_column('scriptsTable', sa.Column('scriptNotes', sa.Text(), nullable=True))
    
    # Rename venue notes field for better naming consistency
    op.alter_column('venuesTable', 'notes', new_column_name='venueNotes')


def downgrade() -> None:
    """Remove scriptNotes column from scriptsTable and revert venue notes field."""
    # Revert venue notes field rename
    op.alter_column('venuesTable', 'venueNotes', new_column_name='notes')
    
    # Remove scriptNotes column from scriptsTable
    op.drop_column('scriptsTable', 'scriptNotes')
