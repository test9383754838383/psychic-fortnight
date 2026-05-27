import re
import uuid
from typing import List, Optional, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.master_data.exceptions import (
    DuplicatePortUnlocodeError,
    InvalidPortCoordinatesError,
    InvalidPortStatusError,
    InvalidUnlocodeError,
    PortNotFoundError,
)
from src.modules.master_data.models.port import Port, PortStatus
from src.modules.master_data.reference.unlocode_country import UNLOCODE_COUNTRY
from src.modules.master_data.repositories.port_repository import PortRepository

UNLOCODE_PATTERN = re.compile(r"^[A-Z]{2}[A-Z0-9]{3}$")


class PortCreateData(TypedDict, total=False):
    unlocode: str
    name: str
    timezone: str
    latitude: float
    longitude: float
    distance_table_ref: Optional[str]
    status: str


class PortUpdateData(TypedDict, total=False):
    unlocode: str
    name: str
    timezone: str
    latitude: float
    longitude: float
    distance_table_ref: Optional[str]
    status: str


class PortService:
    def __init__(self, session: AsyncSession):
        self.repository = PortRepository(session=session)
        self.session = session

    def _validate_unlocode(self, unlocode: str) -> str:
        """Validate UNLOCODE format and check country prefix."""
        if not UNLOCODE_PATTERN.match(unlocode):
            raise InvalidUnlocodeError(
                unlocode, "Must be 5 characters in format [A-Z]{2}[A-Z0-9]{3}"
            )

        prefix = unlocode[:2]
        if prefix not in UNLOCODE_COUNTRY:
            raise InvalidUnlocodeError(
                unlocode, f"Country prefix '{prefix}' is not in registered lookup"
            )

        return UNLOCODE_COUNTRY[prefix]

    def _validate_coordinates(self, lat: Optional[float], lon: Optional[float]) -> None:
        """Validate latitude and longitude ranges."""
        if lat is not None and not (-90.0 <= lat <= 90.0):
            raise InvalidPortCoordinatesError(
                f"Latitude must be between -90 and 90. Got {lat}."
            )
        if lon is not None and not (-180.0 <= lon <= 180.0):
            raise InvalidPortCoordinatesError(
                f"Longitude must be between -180 and 180. Got {lon}."
            )

    async def create(self, data: PortCreateData) -> Port:
        # Validate UNLOCODE and derive country
        unlocode = data.get("unlocode")
        if not unlocode:
            raise InvalidUnlocodeError("", "UNLOCODE is required")

        country_name = self._validate_unlocode(unlocode)

        # Validate Coordinates
        self._validate_coordinates(data.get("latitude"), data.get("longitude"))

        # Validate Status
        p_status = data.get("status")
        if p_status and p_status not in [e.value for e in PortStatus]:
            raise InvalidPortStatusError(p_status)

        # Check for duplicate UNLOCODE
        existing = await self.repository.get_one_or_none(unlocode=unlocode)
        if existing:
            raise DuplicatePortUnlocodeError(unlocode)

        # Build port, auto-deriving country
        port_fields = dict(data)
        port_fields["country"] = country_name

        port = Port(**port_fields)
        await self.repository.add(port)
        await self.session.commit()
        await self.session.refresh(port)
        return port

    async def get(self, port_id: uuid.UUID) -> Port:
        port = await self.repository.get_one_or_none(id=port_id)
        if not port:
            raise PortNotFoundError(str(port_id))
        return port

    async def list(
        self,
        status: Optional[str] = None,
        country: Optional[str] = None,
    ) -> List[Port]:
        if status and country:
            ports = await self.repository.get_many(status=status, country=country)
        elif status:
            ports = await self.repository.get_many(status=status)
        elif country:
            ports = await self.repository.get_many(country=country)
        else:
            ports = await self.repository.get_many()

        return list(ports)

    async def update(self, port_id: uuid.UUID, data: PortUpdateData) -> Port:
        port = await self.get(port_id)

        # If UNLOCODE is being updated, validate and derive country
        new_unlocode = data.get("unlocode")
        if new_unlocode and new_unlocode != port.unlocode:
            country_name = self._validate_unlocode(new_unlocode)

            existing = await self.repository.get_one_or_none(unlocode=new_unlocode)
            if existing:
                raise DuplicatePortUnlocodeError(new_unlocode)

            port.unlocode = new_unlocode
            port.country = country_name

        # If coordinates are being updated, validate them
        lat = data.get("latitude") if "latitude" in data else None
        lon = data.get("longitude") if "longitude" in data else None

        # If updating only one coordinate, we validate the resulting pair against ranges
        target_lat = lat if lat is not None else port.latitude
        target_lon = lon if lon is not None else port.longitude
        self._validate_coordinates(target_lat, target_lon)

        # If Status is being updated, validate it
        new_status = data.get("status")
        if new_status and new_status not in [e.value for e in PortStatus]:
            raise InvalidPortStatusError(new_status)

        for key, value in data.items():
            if key != "unlocode":  # UNLOCODE and derived country handled above
                setattr(port, key, value)

        await self.repository.update(port)
        await self.session.commit()
        await self.session.refresh(port)
        return port

    async def deactivate(self, port_id: uuid.UUID) -> Port:
        return await self.update(port_id, PortUpdateData(status="Inactive"))
