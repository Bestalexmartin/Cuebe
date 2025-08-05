"""apply_user_role_enum_constraint_fix

Revision ID: 14484fe66729
Revises: 35a22a864550
Create Date: 2025-08-04 22:15:26.349462

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '14484fe66729'
down_revision: Union[str, Sequence[str], None] = '35a22a864550'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add user role enum constraint"""
    # Create the user role enum type
    user_role_enum = postgresql.ENUM(
        'crew',
        'assistant_director', 
        'stage_manager',
        'assistant_stage_manager',
        'technical_director',
        'lighting_designer',
        'sound_designer',
        'costume_designer',
        'set_designer',
        'props_master',
        'electrician',
        'sound_technician',
        'wardrobe',
        'makeup_artist',
        'hair_stylist',
        'choreographer',
        'music_director',
        'producer',
        'director',
        'other',
        name='user_role_enum',
        create_type=False
    )
    
    # Create the enum type in the database
    user_role_enum.create(op.get_bind(), checkfirst=True)
    
    # Update existing NULL values to 'crew' as default
    op.execute('UPDATE "userTable" SET user_role = \'crew\' WHERE user_role IS NULL OR user_role = \'\'')
    
    # Update any non-conforming values to closest match or 'other'
    # Map common variations to standard values
    op.execute("""
        UPDATE "userTable" SET user_role = CASE
            WHEN LOWER(user_role) IN ('admin', 'administrator') THEN 'other'
            WHEN LOWER(user_role) IN ('department_head', 'dept_head') THEN 'technical_director'
            WHEN LOWER(user_role) IN ('designer') THEN 'set_designer'
            WHEN LOWER(user_role) IN ('technician', 'tech') THEN 'electrician'
            WHEN user_role NOT IN (
                'crew', 'assistant_director', 'stage_manager', 'assistant_stage_manager',
                'technical_director', 'lighting_designer', 'sound_designer', 'costume_designer',
                'set_designer', 'props_master', 'electrician', 'sound_technician',
                'wardrobe', 'makeup_artist', 'hair_stylist', 'choreographer',
                'music_director', 'producer', 'director', 'other'
            ) THEN 'other'
            ELSE user_role
        END
    """)
    
    # Alter the column to use the enum type
    op.alter_column('userTable', 'user_role',
                    existing_type=sa.String(),
                    type_=user_role_enum,
                    existing_nullable=True,
                    postgresql_using='user_role::user_role_enum')


def downgrade() -> None:
    """Remove user role enum constraint"""
    # Convert back to string type
    op.alter_column('userTable', 'user_role',
                    existing_type=postgresql.ENUM(name='user_role_enum'),
                    type_=sa.String(),
                    existing_nullable=True,
                    postgresql_using='user_role::text')
    
    # Drop the enum type
    user_role_enum = postgresql.ENUM(name='user_role_enum')
    user_role_enum.drop(op.get_bind(), checkfirst=True)
