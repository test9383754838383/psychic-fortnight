import re
import uuid
from typing import List, Optional, TypedDict
from pydantic import BaseModel, Field, ValidationError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.master_data.exceptions import (
    AgentFieldsNotAllowedError,
    CounterpartyNotFoundError,
    CounterpartyRoleNotFoundError,
    DuplicateCounterpartyCodeError,
    DuplicateCounterpartyRoleError,
    InvalidAgentFieldsError,
    InvalidCounterpartyStatusError,
    InvalidCounterpartyRoleError,
    InvalidCounterpartyContactsError,
)
from src.modules.master_data.models import Counterparty, CounterpartyStatus, ContactDict
from src.modules.master_data.models.counterparty_role import (
    CounterpartyRole,
    CounterpartyRoleEnum,
)
from src.modules.master_data.reference.unlocode_country import UNLOCODE_COUNTRY
from src.modules.master_data.repositories.counterparty_repository import (
    CounterpartyRepository,
)
from src.modules.master_data.repositories.counterparty_role_repository import (
    CounterpartyRoleRepository,
)

UNLOCODE_PATTERN = re.compile(r"^[A-Z]{2}[A-Z0-9]{3}$")
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class Contact(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    role_hint: Optional[str] = None


class AgentFields(TypedDict, total=False):
    ports_serviced: List[str]
    nomination_contact_email: str


class CounterpartyCreateData(TypedDict, total=False):
    code: str
    name: str
    contacts: List[ContactDict]
    status: str


class CounterpartyUpdateData(TypedDict, total=False):
    code: str
    name: str
    contacts: List[ContactDict]
    status: str


class CounterpartyService:
    def __init__(self, session: AsyncSession):
        self.repository = CounterpartyRepository(session=session)
        self.role_repository = CounterpartyRoleRepository(session=session)
        self.session = session

    def _validate_contacts(self, contacts: List[ContactDict]) -> List[ContactDict]:
        """Validate list of contacts against Pydantic schema."""
        validated_contacts = []
        for contact in contacts:
            try:
                # This will parse and validate the dict using Pydantic Contact model
                val_contact = Contact(**contact)
                val_dict = ContactDict(
                    name=val_contact.name,
                    email=val_contact.email,
                    phone=val_contact.phone,
                    role_hint=val_contact.role_hint,
                )
                validated_contacts.append(val_dict)
            except ValidationError as e:
                # Re-raise custom domain exception
                raise InvalidCounterpartyContactsError(str(e)) from e
        return validated_contacts

    async def create(self, data: CounterpartyCreateData) -> Counterparty:
        # Validate status
        c_status = data.get("status")
        if c_status and c_status not in [e.value for e in CounterpartyStatus]:
            raise InvalidCounterpartyStatusError(c_status)

        # Validate code uniqueness
        code = data.get("code")
        if code:
            existing = await self.repository.get_one_or_none(code=code)
            if existing:
                raise DuplicateCounterpartyCodeError(code)

        # Validate contacts
        contacts = data.get("contacts", [])
        validated_contacts = self._validate_contacts(contacts)

        counterparty_fields = dict(data)
        counterparty_fields["contacts"] = validated_contacts

        counterparty = Counterparty(**counterparty_fields)
        await self.repository.add(counterparty)
        await self.session.commit()
        await self.session.refresh(counterparty)
        return counterparty

    async def get(self, counterparty_id: uuid.UUID) -> Counterparty:
        counterparty = await self.repository.get_one_or_none(id=counterparty_id)
        if not counterparty:
            raise CounterpartyNotFoundError(str(counterparty_id))
        return counterparty

    async def list(
        self,
        status: Optional[str] = None,
        role: Optional[str] = None,
    ) -> List[Counterparty]:
        if role:
            # Query with Join on CounterpartyRole
            stmt = (
                select(Counterparty)
                .join(Counterparty.roles)
                .where(CounterpartyRole.role == role)
            )
            if status:
                stmt = stmt.where(Counterparty.status == status)
            result = await self.session.execute(stmt)
            counterparties = result.scalars().unique().all()
        else:
            if status:
                counterparties = await self.repository.get_many(status=status)
            else:
                counterparties = await self.repository.get_many()

        return list(counterparties)

    async def update(
        self, counterparty_id: uuid.UUID, data: CounterpartyUpdateData
    ) -> Counterparty:
        counterparty = await self.get(counterparty_id)

        # If code is updated, check uniqueness
        new_code = data.get("code")
        if new_code and new_code != counterparty.code:
            existing = await self.repository.get_one_or_none(code=new_code)
            if existing:
                raise DuplicateCounterpartyCodeError(new_code)

        # If status is updated, validate it
        new_status = data.get("status")
        if new_status and new_status not in [e.value for e in CounterpartyStatus]:
            raise InvalidCounterpartyStatusError(new_status)

        # If contacts are updated, validate shape
        if "contacts" in data:
            validated_contacts = self._validate_contacts(data["contacts"])
            counterparty.contacts = validated_contacts

        for key, value in data.items():
            if key != "contacts":
                setattr(counterparty, key, value)

        await self.repository.update(counterparty)
        await self.session.commit()
        await self.session.refresh(counterparty)
        return counterparty

    async def deactivate(self, counterparty_id: uuid.UUID) -> Counterparty:
        return await self.update(
            counterparty_id, CounterpartyUpdateData(status="Inactive")
        )

    async def attach_role(
        self,
        counterparty_id: uuid.UUID,
        role: str,
        agent_fields: Optional[AgentFields] = None,
    ) -> Counterparty:
        counterparty = await self.get(counterparty_id)

        # Validate Role Enum value
        if role not in [e.value for e in CounterpartyRoleEnum]:
            raise InvalidCounterpartyRoleError(role)

        # Check if already attached
        existing_role = await self.role_repository.get_one_or_none(
            counterparty_id=counterparty_id, role=role
        )
        if existing_role:
            raise DuplicateCounterpartyRoleError(str(counterparty_id), role)

        ports_serviced = None
        nomination_contact_email = None

        if role == CounterpartyRoleEnum.AGENT.value:
            if not agent_fields:
                raise InvalidAgentFieldsError(
                    "agent_fields are required when role == 'Agent'"
                )

            ports = agent_fields.get("ports_serviced")
            email = agent_fields.get("nomination_contact_email")

            if not ports:
                raise InvalidAgentFieldsError(
                    "ports_serviced cannot be empty for Agent role"
                )
            if not email:
                raise InvalidAgentFieldsError(
                    "nomination_contact_email is required for Agent role"
                )

            # Validate ports format & country prefixes
            for unlocode in ports:
                if not UNLOCODE_PATTERN.match(unlocode):
                    raise InvalidAgentFieldsError(f"Invalid port format: '{unlocode}'")
                prefix = unlocode[:2]
                if prefix not in UNLOCODE_COUNTRY:
                    raise InvalidAgentFieldsError(
                        f"Country prefix '{prefix}' for port '{unlocode}' is not registered"
                    )

            # Validate email format
            if not EMAIL_PATTERN.match(email):
                raise InvalidAgentFieldsError(f"Invalid email format: '{email}'")

            ports_serviced = ports
            nomination_contact_email = email
        else:
            # If not agent, reject any agent_fields
            if agent_fields:
                has_non_none_fields = any(v is not None for v in agent_fields.values())
                if has_non_none_fields:
                    raise AgentFieldsNotAllowedError(role)

        # Create role
        new_role = CounterpartyRole(
            counterparty_id=counterparty_id,
            role=role,
            ports_serviced=ports_serviced,
            nomination_contact_email=nomination_contact_email,
        )

        await self.role_repository.add(new_role)
        await self.session.commit()
        await self.session.refresh(counterparty)
        return counterparty

    async def detach_role(self, counterparty_id: uuid.UUID, role: str) -> Counterparty:
        counterparty = await self.get(counterparty_id)

        # Find existing role
        existing_role = await self.role_repository.get_one_or_none(
            counterparty_id=counterparty_id, role=role
        )
        if not existing_role:
            raise CounterpartyRoleNotFoundError(str(counterparty_id), role)

        # Delete it
        await self.role_repository.delete(existing_role.id)
        await self.session.commit()
        await self.session.refresh(counterparty)
        return counterparty
