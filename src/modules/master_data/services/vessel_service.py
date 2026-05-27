import uuid
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.master_data.models.vessel import Vessel, VesselStatus, VesselType
from src.modules.master_data.repositories.vessel_repository import VesselRepository
from src.modules.master_data.exceptions import (
    DuplicateVesselCodeError,
    InvalidIMOError,
    VesselNotFoundError,
    InvalidVesselTypeError,
    InvalidVesselStatusError,
)


class VesselService:
    def __init__(self, session: AsyncSession):
        self.repository = VesselRepository(session=session)
        self.session = session

    async def create(self, data: Dict[str, Any]) -> Vessel:
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
        status: str | None = None,
        vessel_type: str | None = None,
        flag: str | None = None,
    ) -> List[Vessel]:
        filters: Dict[str, str] = {}
        if status:
            filters["status"] = status
        if vessel_type:
            filters["vessel_type"] = vessel_type
        if flag:
            filters["flag"] = flag

        # We use get_many with keyword arguments for filtering
        return await self.repository.get_many(**filters)  # type: ignore[arg-type]

    async def update(self, vessel_id: uuid.UUID, data: Dict[str, Any]) -> Vessel:
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
        return await self.update(vessel_id, {"status": "Inactive"})
