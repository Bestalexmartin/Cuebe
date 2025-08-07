"""add script shares table

Revision ID: bb1001
Revises: 378ff369a43e
Create Date: 2025-01-08 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'bb1001'
down_revision = '378ff369a43e'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create script_shares table
    op.create_table('script_shares',
        sa.Column('share_id', sa.UUID(), nullable=False, default=uuid.uuid4),
        sa.Column('script_id', sa.UUID(), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('shared_with_user_id', sa.UUID(), nullable=False),
        sa.Column('share_token', sa.String(255), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=True, default={"view": True, "download": False}),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('access_count', sa.Integer(), nullable=False, default=0),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_accessed_by_ip', sa.String(45), nullable=True),
        sa.Column('share_name', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('date_created', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('date_updated', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('share_id'),
        sa.ForeignKeyConstraint(['script_id'], ['scriptsTable.script_id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['userTable.user_id'], ),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['userTable.user_id'], ),
    )
    
    # Create indexes for performance
    op.create_index('ix_script_shares_share_id', 'script_shares', ['share_id'], unique=False)
    op.create_index('ix_script_shares_script_id', 'script_shares', ['script_id'], unique=False)
    op.create_index('ix_script_shares_share_token', 'script_shares', ['share_token'], unique=True)
    op.create_index('ix_script_shares_shared_with_user_id', 'script_shares', ['shared_with_user_id'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_script_shares_shared_with_user_id', table_name='script_shares')
    op.drop_index('ix_script_shares_share_token', table_name='script_shares')
    op.drop_index('ix_script_shares_script_id', table_name='script_shares')
    op.drop_index('ix_script_shares_share_id', table_name='script_shares')
    
    # Drop table
    op.drop_table('script_shares')