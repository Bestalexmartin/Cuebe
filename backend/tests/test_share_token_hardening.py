from datetime import datetime, timedelta, timezone
from uuid import uuid4

from models import CrewAssignment, Department, Show, User, UserStatus
from services.share_token_service import (
    find_assignment_by_share_token,
    get_share_link_id,
    is_share_active,
    issue_share_token,
)


def _create_assignment_fixture(db_session, owner_user):
    crew_user = User(
        user_id=uuid4(),
        email_address=f"crew_{uuid4().hex[:8]}@example.com",
        fullname_first="Crew",
        fullname_last="Member",
        user_status=UserStatus.VERIFIED,
        user_role="crew",
        created_by=owner_user.user_id,
    )
    department = Department(
        department_id=uuid4(),
        department_name="Lighting",
        department_color="#123456",
        owner_id=owner_user.user_id,
    )
    show = Show(
        show_id=uuid4(),
        show_name="Token Test Show",
        owner_id=owner_user.user_id,
    )
    assignment = CrewAssignment(
        assignment_id=uuid4(),
        show_id=show.show_id,
        user_id=crew_user.user_id,
        department_id=department.department_id,
        is_active=True,
    )

    db_session.add_all([crew_user, department, show, assignment])
    db_session.commit()
    db_session.refresh(assignment)
    return crew_user, department, show, assignment


def test_issue_share_token_sets_hash_hint_and_expiry(mock_user, db_session):
    _, _, _, assignment = _create_assignment_fixture(db_session, mock_user)

    raw_token, expires_at = issue_share_token(assignment)

    assert raw_token
    assert assignment.share_token_hash is not None
    assert assignment.share_token_hint == raw_token[-12:]
    assert assignment.share_expires_at == expires_at
    assert is_share_active(assignment) is True
    assert get_share_link_id(assignment) == raw_token[-12:]


def test_find_assignment_by_share_token_supports_hashed_tokens(mock_user, db_session):
    _, _, _, assignment = _create_assignment_fixture(db_session, mock_user)
    raw_token, _ = issue_share_token(assignment)
    db_session.commit()

    found = find_assignment_by_share_token(db_session, raw_token)

    assert found is not None
    assert found.assignment_id == assignment.assignment_id


def test_find_assignment_by_share_token_rejects_expired_tokens(mock_user, db_session):
    _, _, _, assignment = _create_assignment_fixture(db_session, mock_user)
    raw_token, _ = issue_share_token(assignment)
    assignment.share_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    found = find_assignment_by_share_token(db_session, raw_token)

    assert found is None


def test_share_endpoint_returns_link_metadata(test_client, mock_user, db_session):
    crew_user, _, show, assignment = _create_assignment_fixture(db_session, mock_user)

    response = test_client.post(f"/api/shows/{show.show_id}/crew/{crew_user.user_id}/share")

    assert response.status_code == 200
    data = response.json()
    assert data["assignment_id"] == str(assignment.assignment_id)
    assert data["share_token"]
    assert data["share_link_id"] == data["share_token"][-12:]
    assert data["share_url"].endswith(data["share_token"])
    assert data["share_expires_at"]
