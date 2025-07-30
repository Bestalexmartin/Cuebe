"""add_user_preferences_bitmap_field

Revision ID: 6f1a705fecfb
Revises: d0e03c67e91c
Create Date: 2025-07-30 11:45:09.052367

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f1a705fecfb'
down_revision: Union[str, Sequence[str], None] = 'd0e03c67e91c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add the new bitmap field
    op.add_column('userTable', sa.Column('userPreferencesBitmap', sa.Integer(), nullable=True, default=0))
    
    # Migrate existing userOptions JSON to bitmap format
    connection = op.get_bind()
    
    # Define bit positions for existing options
    USER_PREFERENCE_BITS = {
        'colorizeDepNames': 0,
        'autoSortCues': 1, 
        'showClockTimes': 2
    }
    
    # Convert existing JSON preferences to bitmap
    result = connection.execute(sa.text('SELECT "userID", "userOptions" FROM "userTable" WHERE "userOptions" IS NOT NULL'))
    
    for row in result:
        user_id, user_options = row
        if user_options:
            bitmap = 0
            for key, bit_pos in USER_PREFERENCE_BITS.items():
                if key in user_options and user_options[key] is True:
                    bitmap |= (1 << bit_pos)
            
            connection.execute(
                sa.text('UPDATE "userTable" SET "userPreferencesBitmap" = :bitmap WHERE "userID" = :user_id'),
                {'bitmap': bitmap, 'user_id': user_id}
            )
    
    # Set default bitmap for users without preferences (darkMode=0, colorizeDepNames=1, autoSortCues=1, showClockTimes=0)
    connection.execute(
        sa.text('UPDATE "userTable" SET "userPreferencesBitmap" = 6 WHERE "userPreferencesBitmap" IS NULL')
    )  # 6 = 0b0110 = darkMode(0) + colorizeDepNames(1) + autoSortCues(1) + showClockTimes(0)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the bitmap column
    op.drop_column('userTable', 'userPreferencesBitmap')
