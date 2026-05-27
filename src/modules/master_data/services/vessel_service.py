import uuid
from typing import List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.master_data.exceptions import (
    DuplicateVesselCodeError,
    InvalidIMOError,
    InvalidVesselStatusError,
    InvalidVesselTypeError,
    VesselNotFoundError,
)
from src.modules.master_data.models.vessel import Vessel, VesselStatus, VesselType
from src.modules.master_data.repositories.vessel_repository import VesselRepository


class VesselCreateData(TypedDict, total=False):
    code: str
    name: str
    imo: str
    vessel_type: str
    flag: str
    active_for_reporting: bool
    status: str
    owner_ref: Optional[str]
    technical_manager_ref: Optional[str]
    ops_manager_user_id: Optional[str]


class VesselUpdateData(TypedDict, total=False):
    code: str
    name: str
    imo: str
    vessel_type: str
    flag: str
    active_for_reporting: bool
    status: str
    owner_ref: Optional[str]
    technical_manager_ref: Optional[str]
    ops_manager_user_id: Optional[str]


class VesselService:
    def __init__(self, session: AsyncSession):
        self.repository = VesselRepository(session=session)
        self.session = session

    async def create(self, data: VesselCreateData) -> Vessel:
        # Validate IMO
        imo = data.get("imo")
        if imo and (not imo.isdigit() or len(imo) != 7):
            raise InvalidIMOError(imo)

        # Validate Vessel Type
        v_type = data.get("vessel_type")
        if v_type and v_type not in [e.value for e in VesselType]:
            raise InvalidVesselTypeError(v_type)

        # Validate Status
        v_status = data.get("status")
        if v_status and v_status not in [e.value for e in VesselStatus]:
            raise InvalidVesselStatusError(v_status)

        # Check for duplicate code
        code = data.get("code")
        if code:
            existing = await self.repository.get_one_or_none(code=code)
            if existing:
                raise DuplicateVesselCodeError(code)

        vessel = Vessel(**data)
        await self.repository.add(vessel)
        await self.session.commit()
        await self.session.refresh(vessel)
        return vessel

    async def get(self, vessel_id: uuid.UUID) -> Vessel:
        vessel = await self.repository.get_one_or_none(id=vessel_id)
        if not vessel:
            raise VesselNotFoundError(str(vessel_id))
        return vessel

    async def list(
        self,
        status: Optional[str] = None,
        vessel_type: Optional[str] = None,
        flag: Optional[str] = None,
    ) -> List[Vessel]:
        # Advanced-alchemy's get_many equality filters are passed via kwargs.
        # To avoid mypy issues with **filters expansion and maintain strictness,
        # we call it with explicit arguments.
        # Note: get_many will filter by None if passed, so we must only pass what is set.

        if status and vessel_type and flag:
            vessels = await self.repository.get_many(
                status=status, vessel_type=vessel_type, flag=flag
            )
        elif status and vessel_type:
            vessels = await self.repository.get_many(
                status=status, vessel_type=vessel_type
            )
        elif status and flag:
            vessels = await self.repository.get_many(status=status, flag=flag)
        elif vessel_type and flag:
            vessels = await self.repository.get_many(vessel_type=vessel_type, flag=flag)
        elif status:
            vessels = await self.repository.get_many(status=status)
        elif vessel_type:
            vessels = await self.repository.get_many(vessel_type=vessel_type)
        elif flag:
            vessels = await self.repository.get_many(flag=flag)
        else:
            vessels = await self.repository.get_many()

        return list(vessels)

    async def update(self, vessel_id: uuid.UUID, data: VesselUpdateData) -> Vessel:
        vessel = await self.get(vessel_id)

        # If code is being updated, check for duplicates
        new_code = data.get("code")
        if new_code and new_code != vessel.code:
            existing = await self.repository.get_one_or_none(code=new_code)
            if existing:
                raise DuplicateVesselCodeError(new_code)

        # If IMO is being updated, validate it
        new_imo = data.get("imo")
        if new_imo and (not new_imo.isdigit() or len(new_imo) != 7):
            raise InvalidIMOError(new_imo)

        # If Type is being updated, validate it
        new_type = data.get("vessel_type")
        if new_type and new_type not in [e.value for e in VesselType]:
            raise InvalidVesselTypeError(new_type)

        # If Status is being updated, validate it
        new_status = data.get("status")
        if new_status and new_status not in [e.value for e in VesselStatus]:
            raise InvalidVesselStatusError(new_status)

        for key, value in data.items():
            setattr(vessel, key, value)

        await self.repository.update(vessel)
        await self.session.commit()
        await self.session.refresh(vessel)
        return vessel

    async def deactivate(self, vessel_id: uuid.UUID) -> Vessel:
        return await self.update(vessel_id, VesselUpdateData(status="Inactive"))
