"""Harden crew share token storage and add expiry metadata.

Revision ID: share_token_hardening_20260616
Revises: blok017_auth_migration
Create Date: 2026-06-16 10:30:00
"""

from typing import Sequence, Union
import hashlib

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "share_token_hardening_20260616"
down_revision: Union[str, Sequence[str], None] = "blok017_auth_migration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "crewAssignmentsTable",
        sa.Column("share_token_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "crewAssignmentsTable",
        sa.Column("share_token_hint", sa.String(length=12), nullable=True),
    )
    op.add_column(
        "crewAssignmentsTable",
        sa.Column("share_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        op.f("ix_crewAssignmentsTable_share_token_hash"),
        "crewAssignmentsTable",
        ["share_token_hash"],
        unique=True,
    )

    bind = op.get_bind()
    rows = bind.execute(
        sa.text('SELECT assignment_id, share_token FROM "crewAssignmentsTable" WHERE share_token IS NOT NULL')
    ).fetchall()

    for row in rows:
        token_hash = hashlib.sha256(row.share_token.encode("utf-8")).hexdigest()
        bind.execute(
            sa.text(
                """
                UPDATE "crewAssignmentsTable"
                SET share_token_hash = :token_hash,
                    share_token_hint = :token_hint,
                    share_expires_at = NOW() + INTERVAL '30 days'
                WHERE assignment_id = :assignment_id
                """
            ),
            {
                "assignment_id": row.assignment_id,
                "token_hash": token_hash,
                "token_hint": row.share_token[-12:],
            },
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_crewAssignmentsTable_share_token_hash"), table_name="crewAssignmentsTable")
    op.drop_column("crewAssignmentsTable", "share_expires_at")
    op.drop_column("crewAssignmentsTable", "share_token_hint")
    op.drop_column("crewAssignmentsTable", "share_token_hash")
