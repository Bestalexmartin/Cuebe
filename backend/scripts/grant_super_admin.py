# backend/scripts/grant_super_admin.py
"""Bootstrap or repair a SUPER_ADMIN account with a one-time temporary password.

Run inside the backend container:

    docker compose exec backend python3 scripts/grant_super_admin.py [email]

Defaults to the operator account. Generates a random temporary password (printed
once, to this terminal only), promotes the account to SUPER_ADMIN, and marks the
email verified. Log in with the temp password, then change it immediately in
Account Settings.
"""

import os
import secrets
import sys
from datetime import datetime, timezone

# Ensure the backend package root is importable when run as a script.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
from database import SessionLocal
from services.auth_service import hash_password

DEFAULT_EMAIL = "dataless@me.com"


def main() -> None:
    email = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL

    db = SessionLocal()
    try:
        user = (
            db.query(models.User)
            .filter(models.User.email_address.ilike(email))
            .first()
        )
        if not user:
            print(f"No user found for {email!r}.")
            sys.exit(1)

        temp_password = secrets.token_urlsafe(12)
        user.password_hash = hash_password(temp_password)
        user.access_role = models.AccessRole.SUPER_ADMIN
        user.email_verified = True
        user.password_changed_at = datetime.now(timezone.utc)
        db.commit()

        print(f"Updated {user.email_address}:")
        print("  access_role -> SUPER_ADMIN")
        print(f"  temporary password -> {temp_password}")
        print("Log in with this, then change it in Account Settings.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
