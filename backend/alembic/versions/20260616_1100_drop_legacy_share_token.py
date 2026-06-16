"""Drop the legacy plaintext share_token column from crew assignments.

The hardened scheme (share_token_hash / share_token_hint / share_expires_at)
is live and the prior migration backfilled hashes for every existing token,
so the plaintext column is now redundant. Dropping the column also removes its
dependent unique index in PostgreSQL.

Revision ID: drop_legacy_share_token_20260616
Revises: share_token_hardening_20260616
Create Date: 2026-06-16 11:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "drop_legacy_share_token_20260616"
down_revision: Union[str, Sequence[str], None] = "share_token_hardening_20260616"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("crewAssignmentsTable", "share_token")


def downgrade() -> None:
    op.add_column(
        "crewAssignmentsTable",
        sa.Column("share_token", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_crewAssignmentsTable_share_token"),
        "crewAssignmentsTable",
        ["share_token"],
        unique=True,
    )
