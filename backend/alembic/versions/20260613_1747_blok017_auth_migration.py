"""Blok 017 (Cuebe hybrid): self-hosted auth tables, access tier, and ProductionRole

Adds the Blok 017 authentication schema in additive form. Single-tenant Cuebe:
no organization tables, org_id is a dormant null-object (INDIVIDUAL_ORG_ID).

Schema (additive only, never drops or recreates existing tables):
  - New enums: accessrole (Layer 1 access tier), productionrole (Layer 3 job role)
  - New userTable columns: access_role, org_id, password_hash, password_changed_at,
    email_verified, failed_login_attempts, locked_until
  - New tables: userSessionsTable, userMfaTable, emailVerificationTokensTable,
    passwordResetTokensTable, authAuditLogTable
  - crewAssignmentsTable.show_role: String -> Enum(productionrole), best-effort map

Backfill (after schema ops, in upgrade()):
  - Every existing user: org_id = INDIVIDUAL_ORG_ID (00000000-0000-0000-0000-000000000000)
  - access_role from user_status: VERIFIED -> USER, GUEST -> GUEST
  - email_verified = True where user_status = VERIFIED
  - password_hash stays NULL (Clerk-era users reset password on first login)
  - show_role free text mapped to ProductionRole; unknowns -> OTHER

RETAINS ALL DEMO DATA. No DROP/TRUNCATE of existing rows or tables.

Revision ID: blok017_auth_migration
Revises: merge_fix_is_collapsed_3a0f68_20250901
Create Date: 2026-06-13 17:47:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "blok017_auth_migration"
down_revision: Union[str, Sequence[str], None] = "merge_fix_is_collapsed_3a0f68_20250901"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Null-object organization id (single-tenant). Matches models.INDIVIDUAL_ORG_ID.
INDIVIDUAL_ORG_ID = "00000000-0000-0000-0000-000000000000"

# Layer 1 access tier values (SQLAlchemy stores the member NAMES, uppercase).
ACCESS_ROLE_VALUES = ("SUPER_ADMIN", "ADMIN", "MANAGER", "USER", "GUEST")

# Layer 3 production role values (formerly the 20-value UserRole enum).
PRODUCTION_ROLE_VALUES = (
    "CREW",
    "ASSISTANT_DIRECTOR",
    "STAGE_MANAGER",
    "ASSISTANT_STAGE_MANAGER",
    "TECHNICAL_DIRECTOR",
    "LIGHTING_DESIGNER",
    "SOUND_DESIGNER",
    "PROPS_MASTER",
    "ELECTRICIAN",
    "SOUND_TECHNICIAN",
    "PROJECTIONIST",
    "RECORDIST",
    "LEAD_AUDIO",
    "LEAD_VIDEO",
    "GRAPHICS",
    "FLY_OPERATOR",
    "CARPENTER",
    "PRODUCER",
    "DIRECTOR",
    "OTHER",
)

access_role_enum = postgresql.ENUM(*ACCESS_ROLE_VALUES, name="accessrole")
production_role_enum = postgresql.ENUM(*PRODUCTION_ROLE_VALUES, name="productionrole")


def upgrade() -> None:
    bind = op.get_bind()

    # --- Native enum types (idempotent) ---------------------------------------
    access_role_enum.create(bind, checkfirst=True)
    production_role_enum.create(bind, checkfirst=True)

    # --- New userTable columns (Layer 1 access tier + credentials) ------------
    # Added nullable / with server_default first so existing rows are valid,
    # then backfilled and tightened below.
    op.add_column(
        "userTable",
        sa.Column(
            "access_role",
            sa.Enum(*ACCESS_ROLE_VALUES, name="accessrole"),
            nullable=True,
        ),
    )
    op.add_column(
        "userTable",
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "userTable",
        sa.Column("password_hash", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "userTable",
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "userTable",
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "userTable",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "userTable",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )

    # --- New auth tables ------------------------------------------------------
    op.create_table(
        "userSessionsTable",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=255), nullable=False),
        sa.Column("device_info", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_revoked", sa.Boolean(), nullable=False),
        sa.Column("revoked_reason", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["userTable.user_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_sessions_expiry",
        "userSessionsTable",
        ["expires_at", "is_revoked"],
        unique=False,
    )
    op.create_index(
        op.f("ix_userSessionsTable_family_id"),
        "userSessionsTable",
        ["family_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_userSessionsTable_refresh_token_hash"),
        "userSessionsTable",
        ["refresh_token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_userSessionsTable_user_id"),
        "userSessionsTable",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "userMfaTable",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("totp_secret_encrypted", sa.Text(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "backup_codes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["userTable.user_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "emailVerificationTokensTable",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["userTable.user_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_emailVerificationTokensTable_token_hash"),
        "emailVerificationTokensTable",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "passwordResetTokensTable",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["userTable.user_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_passwordResetTokensTable_token_hash"),
        "passwordResetTokensTable",
        ["token_hash"],
        unique=True,
    )

    op.create_table(
        "authAuditLogTable",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "details", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_audit_timestamp", "authAuditLogTable", ["timestamp"], unique=False
    )
    op.create_index(
        "idx_audit_event_type", "authAuditLogTable", ["event_type"], unique=False
    )
    op.create_index(
        "idx_audit_user_timestamp",
        "authAuditLogTable",
        ["user_id", "timestamp"],
        unique=False,
    )

    # ==========================================================================
    # DATA BACKFILL (additive; touches only the new columns, preserves demo data)
    # ==========================================================================

    # org_id -> INDIVIDUAL_ORG_ID for every existing user (single-tenant null-object).
    op.execute(
        sa.text(
            'UPDATE "userTable" SET org_id = :org_id WHERE org_id IS NULL'
        ).bindparams(org_id=INDIVIDUAL_ORG_ID)
    )

    # access_role from user_status: VERIFIED -> USER, GUEST -> GUEST.
    # user_status is itself a native enum storing member names (VERIFIED / GUEST).
    op.execute(
        """
        UPDATE "userTable"
        SET access_role = CASE
            WHEN user_status = 'VERIFIED' THEN 'USER'::accessrole
            WHEN user_status = 'GUEST' THEN 'GUEST'::accessrole
            ELSE 'GUEST'::accessrole
        END
        WHERE access_role IS NULL
        """
    )

    # email_verified = True for verified (Clerk-authenticated) users.
    op.execute(
        """
        UPDATE "userTable"
        SET email_verified = TRUE
        WHERE user_status = 'VERIFIED'
        """
    )

    # password_hash intentionally left NULL: these accounts came from Clerk and
    # will set a password via the reset-on-first-login flow.

    # --- Tighten the now-backfilled columns -----------------------------------
    op.alter_column("userTable", "access_role", nullable=False)
    op.alter_column(
        "userTable", "access_role", server_default="USER"
    )
    op.alter_column("userTable", "org_id", nullable=False)
    op.alter_column(
        "userTable",
        "org_id",
        server_default=sa.text(f"'{INDIVIDUAL_ORG_ID}'::uuid"),
    )

    # ==========================================================================
    # crewAssignmentsTable.show_role: String -> Enum(productionrole)
    # ==========================================================================
    # Defensive, best-effort: existing free-text titles are normalized to the
    # closest ProductionRole; anything unrecognized becomes OTHER. NULLs stay
    # NULL (the column remains nullable). No rows are dropped.
    #
    # Existing demo values observed: 'crew', 'sound_designer' (lowercase legacy).
    # The mapping is case-insensitive over UPPER(value) and folds common
    # free-text job titles ("head of sound", "assistant ld", etc.).
    op.execute(
        r"""
        ALTER TABLE "crewAssignmentsTable"
        ALTER COLUMN show_role TYPE productionrole
        USING (
            CASE UPPER(TRIM(COALESCE(show_role, '')))
                WHEN '' THEN NULL
                -- direct enum-name matches (handles legacy lowercase too)
                WHEN 'CREW' THEN 'CREW'
                WHEN 'ASSISTANT_DIRECTOR' THEN 'ASSISTANT_DIRECTOR'
                WHEN 'STAGE_MANAGER' THEN 'STAGE_MANAGER'
                WHEN 'ASSISTANT_STAGE_MANAGER' THEN 'ASSISTANT_STAGE_MANAGER'
                WHEN 'TECHNICAL_DIRECTOR' THEN 'TECHNICAL_DIRECTOR'
                WHEN 'LIGHTING_DESIGNER' THEN 'LIGHTING_DESIGNER'
                WHEN 'SOUND_DESIGNER' THEN 'SOUND_DESIGNER'
                WHEN 'PROPS_MASTER' THEN 'PROPS_MASTER'
                WHEN 'ELECTRICIAN' THEN 'ELECTRICIAN'
                WHEN 'SOUND_TECHNICIAN' THEN 'SOUND_TECHNICIAN'
                WHEN 'PROJECTIONIST' THEN 'PROJECTIONIST'
                WHEN 'RECORDIST' THEN 'RECORDIST'
                WHEN 'LEAD_AUDIO' THEN 'LEAD_AUDIO'
                WHEN 'LEAD_VIDEO' THEN 'LEAD_VIDEO'
                WHEN 'GRAPHICS' THEN 'GRAPHICS'
                WHEN 'FLY_OPERATOR' THEN 'FLY_OPERATOR'
                WHEN 'CARPENTER' THEN 'CARPENTER'
                WHEN 'PRODUCER' THEN 'PRODUCER'
                WHEN 'DIRECTOR' THEN 'DIRECTOR'
                WHEN 'OTHER' THEN 'OTHER'
                -- common free-text job-title folds
                WHEN 'HEAD OF SOUND' THEN 'SOUND_DESIGNER'
                WHEN 'ASSISTANT LD' THEN 'LIGHTING_DESIGNER'
                WHEN 'ASSISTANT LIGHTING DESIGNER' THEN 'LIGHTING_DESIGNER'
                WHEN 'LD' THEN 'LIGHTING_DESIGNER'
                WHEN 'SM' THEN 'STAGE_MANAGER'
                WHEN 'ASM' THEN 'ASSISTANT_STAGE_MANAGER'
                WHEN 'AD' THEN 'ASSISTANT_DIRECTOR'
                WHEN 'TD' THEN 'TECHNICAL_DIRECTOR'
                ELSE 'OTHER'
            END
        )::productionrole
        """
    )


def downgrade() -> None:
    # Revert show_role to free-text String, preserving values.
    op.execute(
        r"""
        ALTER TABLE "crewAssignmentsTable"
        ALTER COLUMN show_role TYPE VARCHAR
        USING (show_role::text)
        """
    )

    op.drop_index("idx_audit_user_timestamp", table_name="authAuditLogTable")
    op.drop_index("idx_audit_event_type", table_name="authAuditLogTable")
    op.drop_index("idx_audit_timestamp", table_name="authAuditLogTable")
    op.drop_table("authAuditLogTable")

    op.drop_index(
        op.f("ix_passwordResetTokensTable_token_hash"),
        table_name="passwordResetTokensTable",
    )
    op.drop_table("passwordResetTokensTable")

    op.drop_index(
        op.f("ix_emailVerificationTokensTable_token_hash"),
        table_name="emailVerificationTokensTable",
    )
    op.drop_table("emailVerificationTokensTable")

    op.drop_table("userMfaTable")

    op.drop_index(
        op.f("ix_userSessionsTable_user_id"), table_name="userSessionsTable"
    )
    op.drop_index(
        op.f("ix_userSessionsTable_refresh_token_hash"),
        table_name="userSessionsTable",
    )
    op.drop_index(
        op.f("ix_userSessionsTable_family_id"), table_name="userSessionsTable"
    )
    op.drop_index("idx_sessions_expiry", table_name="userSessionsTable")
    op.drop_table("userSessionsTable")

    op.drop_column("userTable", "locked_until")
    op.drop_column("userTable", "failed_login_attempts")
    op.drop_column("userTable", "email_verified")
    op.drop_column("userTable", "password_changed_at")
    op.drop_column("userTable", "password_hash")
    op.drop_column("userTable", "org_id")
    op.drop_column("userTable", "access_role")

    production_role_enum.drop(op.get_bind(), checkfirst=True)
    access_role_enum.drop(op.get_bind(), checkfirst=True)
