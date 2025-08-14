"""Convert user role enum values to UPPERCASE per CLAUDE.md standards

Revision ID: 20250814_212000
Revises: 20250814_210000
Create Date: 2025-08-14 21:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250814_212000'
down_revision = '20250814_210000'
branch_labels = None
depends_on = None


def upgrade():
    # Drop and recreate the enum type with UPPERCASE values
    op.execute("ALTER TYPE user_role_enum RENAME TO user_role_enum_old")
    
    # Create new enum type with UPPERCASE values
    op.execute("""
        CREATE TYPE user_role_enum AS ENUM (
            'CREW',
            'ASSISTANT_DIRECTOR',
            'STAGE_MANAGER',
            'ASSISTANT_STAGE_MANAGER',
            'TECHNICAL_DIRECTOR',
            'LIGHTING_DESIGNER',
            'SOUND_DESIGNER',
            'PROPS_MASTER',
            'ELECTRICIAN',
            'SOUND_TECHNICIAN',
            'PROJECTIONIST',
            'RECORDIST',
            'LEAD_AUDIO',
            'LEAD_VIDEO',
            'GRAPHICS',
            'FLY_OPERATOR',
            'CARPENTER',
            'PRODUCER',
            'DIRECTOR',
            'OTHER'
        )
    """)
    
    # Update the column to use the new enum with data transformation
    op.execute("""
        ALTER TABLE "userTable" 
        ALTER COLUMN user_role TYPE user_role_enum 
        USING CASE 
            WHEN user_role::text = 'crew' THEN 'CREW'::user_role_enum
            WHEN user_role::text = 'assistant_director' THEN 'ASSISTANT_DIRECTOR'::user_role_enum
            WHEN user_role::text = 'stage_manager' THEN 'STAGE_MANAGER'::user_role_enum
            WHEN user_role::text = 'assistant_stage_manager' THEN 'ASSISTANT_STAGE_MANAGER'::user_role_enum
            WHEN user_role::text = 'technical_director' THEN 'TECHNICAL_DIRECTOR'::user_role_enum
            WHEN user_role::text = 'lighting_designer' THEN 'LIGHTING_DESIGNER'::user_role_enum
            WHEN user_role::text = 'sound_designer' THEN 'SOUND_DESIGNER'::user_role_enum
            WHEN user_role::text = 'props_master' THEN 'PROPS_MASTER'::user_role_enum
            WHEN user_role::text = 'electrician' THEN 'ELECTRICIAN'::user_role_enum
            WHEN user_role::text = 'sound_technician' THEN 'SOUND_TECHNICIAN'::user_role_enum
            WHEN user_role::text = 'projectionist' THEN 'PROJECTIONIST'::user_role_enum
            WHEN user_role::text = 'recordist' THEN 'RECORDIST'::user_role_enum
            WHEN user_role::text = 'lead_audio' THEN 'LEAD_AUDIO'::user_role_enum
            WHEN user_role::text = 'lead_video' THEN 'LEAD_VIDEO'::user_role_enum
            WHEN user_role::text = 'graphics' THEN 'GRAPHICS'::user_role_enum
            WHEN user_role::text = 'fly_operator' THEN 'FLY_OPERATOR'::user_role_enum
            WHEN user_role::text = 'carpenter' THEN 'CARPENTER'::user_role_enum
            WHEN user_role::text = 'producer' THEN 'PRODUCER'::user_role_enum
            WHEN user_role::text = 'director' THEN 'DIRECTOR'::user_role_enum
            WHEN user_role::text = 'other' THEN 'OTHER'::user_role_enum
            ELSE 'OTHER'::user_role_enum
        END
    """)
    
    # Drop the old enum
    op.execute("DROP TYPE user_role_enum_old")


def downgrade():
    # Update existing user data back to lowercase values
    op.execute("""
        UPDATE "userTable" 
        SET user_role = CASE 
            WHEN user_role = 'CREW' THEN 'crew'
            WHEN user_role = 'ASSISTANT_DIRECTOR' THEN 'assistant_director'
            WHEN user_role = 'STAGE_MANAGER' THEN 'stage_manager'
            WHEN user_role = 'ASSISTANT_STAGE_MANAGER' THEN 'assistant_stage_manager'
            WHEN user_role = 'TECHNICAL_DIRECTOR' THEN 'technical_director'
            WHEN user_role = 'LIGHTING_DESIGNER' THEN 'lighting_designer'
            WHEN user_role = 'SOUND_DESIGNER' THEN 'sound_designer'
            WHEN user_role = 'PROPS_MASTER' THEN 'props_master'
            WHEN user_role = 'ELECTRICIAN' THEN 'electrician'
            WHEN user_role = 'SOUND_TECHNICIAN' THEN 'sound_technician'
            WHEN user_role = 'PROJECTIONIST' THEN 'projectionist'
            WHEN user_role = 'RECORDIST' THEN 'recordist'
            WHEN user_role = 'LEAD_AUDIO' THEN 'lead_audio'
            WHEN user_role = 'LEAD_VIDEO' THEN 'lead_video'
            WHEN user_role = 'GRAPHICS' THEN 'graphics'
            WHEN user_role = 'FLY_OPERATOR' THEN 'fly_operator'
            WHEN user_role = 'CARPENTER' THEN 'carpenter'
            WHEN user_role = 'PRODUCER' THEN 'producer'
            WHEN user_role = 'DIRECTOR' THEN 'director'
            WHEN user_role = 'OTHER' THEN 'other'
            ELSE user_role
        END
    """)
    
    # Drop and recreate the old enum type
    op.execute("ALTER TYPE user_role_enum RENAME TO user_role_enum_old")
    
    # Create old enum type with lowercase values
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
    
    # Update the column to use the old enum
    op.execute("""
        ALTER TABLE "userTable" 
        ALTER COLUMN user_role TYPE user_role_enum 
        USING user_role::text::user_role_enum
    """)
    
    # Drop the new enum
    op.execute("DROP TYPE user_role_enum_old")