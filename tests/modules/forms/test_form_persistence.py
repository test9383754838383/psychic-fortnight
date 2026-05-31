import uuid
import pytest
import json
from sqlalchemy import select

from src.modules.forms.constants import FormStatus, FormSourceType
from src.modules.forms.exceptions import (
    IllegalFormTransitionError,
    FormTerminalStateError,
    FormPermissionError,
    FormAnchorError,
)
from src.modules.forms.models.models import FormDetail, FormParseAttempt
from src.modules.forms.service.form_service import FormService
from src.modules.auth.models.user import User, UserRole
from src.modules.auth.models.role import Role

from tests.modules.forms.test_parser import (
    SequenceFakeStructuredClient,
    _NOON_VALID_PAYLOAD,
)


@pytest.fixture
async def vessel(session):
    from tests.modules.master_data.conftest import VesselFactory

    v = VesselFactory()
    session.add(v)
    await session.commit()
    return v


@pytest.fixture
async def port(session):
    from tests.modules.master_data.conftest import PortFactory

    p = PortFactory()
    session.add(p)
    await session.commit()
    return p


@pytest.fixture
async def port_call(session, voyage, port):
    from tests.modules.port_call.conftest import PortCallFactory

    pc = PortCallFactory(voyage_id=voyage.id, port_id=port.id)
    session.add(pc)
    await session.commit()
    return pc


@pytest.fixture
async def ops_user(session):
    user = User(username="ops_persistence", hashed_password="pw")
    session.add(user)
    await session.flush()

    role = (
        await session.execute(select(Role).where(Role.name == "Operations"))
    ).scalar_one()
    user_role = UserRole(user_id=user.id, role_id=role.id)
    session.add(user_role)
    await session.commit()
    return user


@pytest.fixture
async def admin_user(session):
    user = User(username="admin_persistence", hashed_password="pw")
    session.add(user)
    await session.flush()

    role = (
        await session.execute(select(Role).where(Role.name == "Admin"))
    ).scalar_one()
    user_role = UserRole(user_id=user.id, role_id=role.id)
    session.add(user_role)
    await session.commit()
    return user


@pytest.fixture
async def regular_user(session):
    user = User(username="regular_persistence", hashed_password="pw")
    session.add(user)
    await session.flush()

    role = (
        await session.execute(select(Role).where(Role.name == "Viewer"))
    ).scalar_one()
    user_role = UserRole(user_id=user.id, role_id=role.id)
    session.add(user_role)
    await session.commit()
    return user


@pytest.mark.asyncio
async def test_parse_success(session, voyage, ops_user):
    service = FormService(session)
    client = SequenceFakeStructuredClient([json.dumps(_NOON_VALID_PAYLOAD)])

    form = await service.parse(
        raw_text="Noon Report Data...",
        form_type="Noon",
        voyage_id=voyage.id,
        client=client,
        user_id=ops_user.id,
    )

    assert form.status == FormStatus.RECEIVED.value
    assert form.form_type == "Noon"
    assert form.voyage_id == voyage.id
    assert form.submitted_by == ops_user.id

    # Check detail
    detail = (
        await session.execute(select(FormDetail).where(FormDetail.form_id == form.id))
    ).scalar_one()
    assert detail.raw_fields["vessel_name"] == "MV TEST"
    assert detail.source_type == FormSourceType.PASTE.value

    # Check attempt
    attempt = (
        await session.execute(
            select(FormParseAttempt).where(FormParseAttempt.form_id == form.id)
        )
    ).scalar_one()
    assert attempt.status == "SUCCESS"
    assert attempt.cost_estimate > 0


@pytest.mark.asyncio
async def test_parse_failure_preserves_text(session, voyage, ops_user):
    service = FormService(session)
    client = SequenceFakeStructuredClient(
        [Exception("LLM Timeout"), Exception("LLM Timeout")]
    )

    form = await service.parse(
        raw_text="Garbage data",
        form_type="Noon",
        voyage_id=voyage.id,
        client=client,
        user_id=ops_user.id,
    )

    assert (
        form.status == FormStatus.RECEIVED.value
    )  # D-LOCK-13: even failed parse is a form

    attempt = (
        await session.execute(
            select(FormParseAttempt).where(FormParseAttempt.form_id == form.id)
        )
    ).scalar_one()
    assert attempt.status == "MANUAL_REVIEW"

    detail = (
        await session.execute(select(FormDetail).where(FormDetail.form_id == form.id))
    ).scalar_one()
    assert detail.raw_fields == {}
    assert len(detail.raw_text_hash) == 64


@pytest.mark.asyncio
async def test_xor_anchor_enforcement(session, voyage, port_call, ops_user):
    service = FormService(session)

    # Both set
    with pytest.raises(FormAnchorError):
        await service.parse(
            raw_text="...",
            form_type="Noon",
            voyage_id=voyage.id,
            port_call_id=port_call.id,
            client=None,
            user_id=ops_user.id,
        )

    # Neither set
    with pytest.raises(FormAnchorError):
        await service.parse(
            raw_text="...", form_type="Noon", client=None, user_id=ops_user.id
        )


@pytest.mark.asyncio
async def test_manual_create(session, voyage, ops_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Bunkering",
        raw_fields={"fuel": 100},
        user_id=ops_user.id,
        voyage_id=voyage.id,
        notes="Manual entry",
    )

    assert form.status == FormStatus.RECEIVED.value
    assert form.notes == "Manual entry"

    # No attempt row
    attempts = (
        (
            await session.execute(
                select(FormParseAttempt).where(FormParseAttempt.form_id == form.id)
            )
        )
        .scalars()
        .all()
    )
    assert len(attempts) == 0


@pytest.mark.asyncio
async def test_update_pre_accept(session, voyage, ops_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Noon", raw_fields={"v": 1}, user_id=ops_user.id, voyage_id=voyage.id
    )

    updated = await service.update_pre_accept(
        form.id, {"notes": "Updated", "raw_fields": {"v": 2}}
    )
    assert updated.notes == "Updated"

    detail = (
        await session.execute(select(FormDetail).where(FormDetail.form_id == form.id))
    ).scalar_one()
    assert detail.raw_fields == {"v": 2}


@pytest.mark.asyncio
async def test_update_terminal_fails(session, voyage, ops_user, admin_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Noon", raw_fields={"v": 1}, user_id=ops_user.id, voyage_id=voyage.id
    )

    # Transition to Accepted
    await service.transition(form.id, FormStatus.ACCEPTED, admin_user)

    with pytest.raises(FormTerminalStateError):
        await service.update_pre_accept(form.id, {"notes": "Illegal"})


@pytest.mark.asyncio
async def test_fsm_legal_transitions(session, voyage, ops_user, admin_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Noon", raw_fields={"v": 1}, user_id=ops_user.id, voyage_id=voyage.id
    )

    # Received -> Under Review
    await service.transition(form.id, FormStatus.UNDER_REVIEW, ops_user)
    assert form.status == FormStatus.UNDER_REVIEW.value
    assert form.reviewed_by is None
    assert form.reviewed_at is None

    # Under Review -> Queried
    await service.transition(form.id, FormStatus.QUERIED, ops_user)
    assert form.status == FormStatus.QUERIED.value
    assert form.reviewed_by is None
    assert form.reviewed_at is None

    # Queried -> Under Review
    await service.transition(form.id, FormStatus.UNDER_REVIEW, ops_user)
    assert form.status == FormStatus.UNDER_REVIEW.value

    # Under Review -> Accepted
    await service.transition(form.id, FormStatus.ACCEPTED, admin_user)
    assert form.status == FormStatus.ACCEPTED.value
    assert form.reviewed_by == admin_user.id
    assert form.reviewed_at is not None


@pytest.mark.asyncio
async def test_fsm_illegal_transition(session, voyage, ops_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Noon", raw_fields={"v": 1}, user_id=ops_user.id, voyage_id=voyage.id
    )

    # Received -> Queried (Illegal)
    with pytest.raises(IllegalFormTransitionError):
        await service.transition(form.id, FormStatus.QUERIED, ops_user)


@pytest.mark.asyncio
async def test_role_gate_on_accept(session, voyage, ops_user, regular_user):
    service = FormService(session)
    form = await service.create_manual(
        form_type="Noon", raw_fields={"v": 1}, user_id=ops_user.id, voyage_id=voyage.id
    )

    # Regular user cannot accept
    with pytest.raises(FormPermissionError):
        await service.transition(form.id, FormStatus.ACCEPTED, regular_user)

    # Ops user can accept
    await service.transition(form.id, FormStatus.ACCEPTED, ops_user)
    assert form.status == FormStatus.ACCEPTED.value


@pytest.mark.asyncio
async def test_cross_module_fk_validation(session, ops_user):
    service = FormService(session)
    invalid_voyage_id = uuid.uuid4()

    with pytest.raises(Exception):  # Usually VoyageNotFoundError or similar
        await service.create_manual(
            form_type="Noon",
            raw_fields={},
            user_id=ops_user.id,
            voyage_id=invalid_voyage_id,
        )
