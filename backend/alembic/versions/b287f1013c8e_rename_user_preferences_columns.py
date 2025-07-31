# backend/alembic/versions/b287f1013c8e_rename_user_preferences_columns.py

"""rename_user_preferences_columns

Revision ID: b287f1013c8e
Revises: 6f1a705fecfb
Create Date: 2025-07-30 11:54:51.270089

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b287f1013c8e'
down_revision: Union[str, Sequence[str], None] = '6f1a705fecfb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Clear all existing userOptions data to avoid JSON parsing issues
    connection = op.get_bind()
    connection.execute(sa.text('UPDATE "userTable" SET "userOptions" = NULL'))
    
    # Rename userOptions to userPrefsJSON (now clean and empty)
    op.alter_column('userTable', 'userOptions', new_column_name='userPrefsJSON')
    
    # Rename userPreferencesBitmap to userPrefsBitmap
    op.alter_column('userTable', 'userPreferencesBitmap', new_column_name='userPrefsBitmap')
    
    # Convert existing bitmap from old bit positions to new ones
    # Old: colorizeDepNames=0, autoSortCues=1, showClockTimes=2
    # New: darkMode=0, colorizeDepNames=1, autoSortCues=2, showClockTimes=3
    # Read current bitmaps and convert them
    result = connection.execute(sa.text('SELECT "userID", "userPrefsBitmap" FROM "userTable" WHERE "userPrefsBitmap" IS NOT NULL'))
    
    for row in result:
        user_id, old_bitmap = row
        if old_bitmap is not None:
            # Extract old bits
            old_colorize = bool(old_bitmap & (1 << 0))  # old position 0
            old_autosort = bool(old_bitmap & (1 << 1))   # old position 1  
            old_clocktime = bool(old_bitmap & (1 << 2))  # old position 2
            
            # Create new bitmap with darkMode=False (0) and shifted positions
            new_bitmap = 0
            new_bitmap |= (0) << 0              # darkMode = False
            new_bitmap |= (old_colorize) << 1   # colorizeDepNames moved to position 1
            new_bitmap |= (old_autosort) << 2   # autoSortCues moved to position 2
            new_bitmap |= (old_clocktime) << 3  # showClockTimes moved to position 3
            
            connection.execute(
                sa.text('UPDATE "userTable" SET "userPrefsBitmap" = :bitmap WHERE "userID" = :user_id'),
                {'bitmap': new_bitmap, 'user_id': user_id}
            )
    
    # Set default bitmap for any remaining NULL values  
    connection.execute(
        sa.text('UPDATE "userTable" SET "userPrefsBitmap" = 6 WHERE "userPrefsBitmap" IS NULL')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Revert column name changes
    op.alter_column('userTable', 'userPrefsJSON', new_column_name='userOptions')
    op.alter_column('userTable', 'userPrefsBitmap', new_column_name='userPreferencesBitmap')
