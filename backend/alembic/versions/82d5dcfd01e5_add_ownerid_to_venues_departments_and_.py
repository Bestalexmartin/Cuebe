# backend/alembic/versions/82d5dcfd01e5_add_ownerid_to_venues_departments_and_.py

"""add ownerID to venues, departments, and scripts for user scoping

Revision ID: 82d5dcfd01e5
Revises: ebde897f9744
Create Date: 2025-07-20 00:30:59.529030

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import uuid
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '82d5dcfd01e5'
down_revision: Union[str, Sequence[str], None] = 'ebde897f9744'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ownerID fields to venues, departments, and scripts for user scoping."""
    
    # Add ownerID column to venuesTable (nullable initially)
    op.add_column('venuesTable', sa.Column('ownerID', UUID(as_uuid=True), nullable=True))
    
    # Add ownerID column to departmentsTable (nullable initially)
    op.add_column('departmentsTable', sa.Column('ownerID', UUID(as_uuid=True), nullable=True))
    
    # Add ownerID column to scriptsTable (nullable initially)
    op.add_column('scriptsTable', sa.Column('ownerID', UUID(as_uuid=True), nullable=True))
    
    # Populate ownerID fields with the known user ID
    # This is user 2's ID: '11a2f61d-e0d1-478c-a715-9f87c563f811'
    connection = op.get_bind()
    user_id = '11a2f61d-e0d1-478c-a715-9f87c563f811'
    
    # Update existing venues to be owned by user 2
    connection.execute(
        sa.text("UPDATE \"venuesTable\" SET \"ownerID\" = :user_id"),
        {"user_id": user_id}
    )
    
    # Update existing departments to be owned by user 2
    connection.execute(
        sa.text("UPDATE \"departmentsTable\" SET \"ownerID\" = :user_id"),
        {"user_id": user_id}
    )
    
    # Update existing scripts to be owned by user 2
    connection.execute(
        sa.text("UPDATE \"scriptsTable\" SET \"ownerID\" = :user_id"),
        {"user_id": user_id}
    )
    
    # Now make the columns non-nullable
    op.alter_column('venuesTable', 'ownerID', nullable=False)
    op.alter_column('departmentsTable', 'ownerID', nullable=False)
    op.alter_column('scriptsTable', 'ownerID', nullable=False)
    
    # Add foreign key constraints
    op.create_foreign_key('fk_venues_owner', 'venuesTable', 'userTable', ['ownerID'], ['userID'])
    op.create_foreign_key('fk_departments_owner', 'departmentsTable', 'userTable', ['ownerID'], ['userID'])
    op.create_foreign_key('fk_scripts_owner', 'scriptsTable', 'userTable', ['ownerID'], ['userID'])
    
    # Remove unique constraint from venueName since venues are now user-scoped
    op.drop_constraint('venuesTable_venueName_key', 'venuesTable', type_='unique')


def downgrade() -> None:
    """Remove ownerID fields and restore original schema."""
    
    # Re-add unique constraint to venueName
    op.create_unique_constraint('venuesTable_venueName_key', 'venuesTable', ['venueName'])
    
    # Drop foreign key constraints
    op.drop_constraint('fk_scripts_owner', 'scriptsTable', type_='foreignkey')
    op.drop_constraint('fk_departments_owner', 'departmentsTable', type_='foreignkey')
    op.drop_constraint('fk_venues_owner', 'venuesTable', type_='foreignkey')
    
    # Drop ownerID columns
    op.drop_column('scriptsTable', 'ownerID')
    op.drop_column('departmentsTable', 'ownerID')
    op.drop_column('venuesTable', 'ownerID')
