"""Update UserRole enum: remove unused roles, add technical roles

Revision ID: 20250814_210000
Revises: 66c8be99acab
Create Date: 2025-08-14 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250814_210000'
down_revision = '66c8be99acab'
branch_labels = None
depends_on = None


def upgrade():
    # First, update any existing users with removed roles to 'other' or appropriate equivalents
    # This prevents constraint violations
    op.execute("""
        UPDATE "userTable" 
        SET user_role = 'other' 
        WHERE user_role IN (
            'music_director', 
            'choreographer', 
            'set_designer', 
            'costume_designer', 
            'makeup_artist', 
            'hair_stylist', 
            'wardrobe'
        )
    """)
    
    # Drop and recreate the enum type with new values
    op.execute("ALTER TYPE user_role_enum RENAME TO user_role_enum_old")
    
    # Create new enum type
    op.execute("""
        CREATE TYPE user_role_enum AS ENUM (
            'crew',
            'assistant_director',
            'stage_manager',
            'assistant_stage_manager',
            'technical_director',
            'lighting_designer',
            'sound_designer',
            'props_master',
            'electrician',
            'sound_technician',
            'projectionist',
            'recordist',
            'lead_audio',
            'lead_video',
            'graphics',
            'fly_operator',
            'carpenter',
            'producer',
            'director',
            'other'
        )
    """)
    
    # Update the column to use the new enum
    op.execute("""
        ALTER TABLE "userTable" 
        ALTER COLUMN user_role TYPE user_role_enum 
        USING user_role::text::user_role_enum
    """)
    
    # Drop the old enum
    op.execute("DROP TYPE user_role_enum_old")


def downgrade():
    # First, update any users with new roles to appropriate equivalents or 'other'
    op.execute("""
        UPDATE "userTable" 
        SET user_role = CASE 
            WHEN user_role = 'projectionist' THEN 'electrician'
            WHEN user_role = 'recordist' THEN 'sound_technician'
            WHEN user_role = 'lead_audio' THEN 'sound_technician'
            WHEN user_role = 'lead_video' THEN 'electrician'
            WHEN user_role = 'graphics' THEN 'other'
            WHEN user_role = 'fly_operator' THEN 'crew'
            WHEN user_role = 'carpenter' THEN 'crew'
            ELSE user_role
        END
        WHERE user_role IN (
            'projectionist', 
            'recordist', 
            'lead_audio', 
            'lead_video', 
            'graphics', 
            'fly_operator', 
            'carpenter'
        )
    """)
    
    # Drop and recreate the old enum type
    op.execute("ALTER TYPE user_role_enum RENAME TO user_role_enum_old")
    
    # Create old enum type
    op.execute("""
        CREATE TYPE user_role_enum AS ENUM (
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
            'other'
        )
    """)
    
    # Update the column to use the old enum
    op.execute("""
        ALTER TABLE "userTable" 
        ALTER COLUMN user_role TYPE user_role_enum 
        USING user_role::text::user_role_enum
    """)
    
    # Drop the new enum
    op.execute("DROP TYPE user_role_enum_old")