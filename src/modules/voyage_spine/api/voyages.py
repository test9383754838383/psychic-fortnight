import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from src.dependencies import get_current_user, get_db_session
from src.modules.voyage_spine.services.voyage_service import (
    VoyageService,
    VoyageCreateData,
    VoyageUpdateData,
    ItineraryLineCreateData,
    ItineraryLineUpdateData,
)

router = APIRouter()


# --- Pydantic DTOs ---


class VoyageTermsDTO(BaseModel):
    charterer_name: Optional[str] = None
    cp_type: Optional[str] = None
    cp_date: Optional[date] = None
    cp_document_ref: Optional[str] = None


class VoyageCreateDTO(BaseModel):
    voyage_no: str
    vessel_ref: uuid.UUID
    commencing_datetime: datetime
    charterer_ref: Optional[uuid.UUID] = None
    previous_voyage_ref: Optional[uuid.UUID] = None
    voyage_instructions: Optional[str] = None
    ops_notes: Optional[str] = None
    terms: Optional[VoyageTermsDTO] = None
    # M1 Voyage Core fields
    status: Optional[str] = None
    ops_coordinator_user_id: Optional[str] = None
    trade_area: Optional[str] = None
    lob: Optional[str] = None
    is_pool: bool = False
    is_ice_class: bool = False
    is_clean: bool = False
    is_coated: bool = False


class VoyageUpdateDTO(BaseModel):
    voyage_no: Optional[str] = None
    vessel_ref: Optional[uuid.UUID] = None
    commencing_datetime: Optional[datetime] = None
    charterer_ref: Optional[uuid.UUID] = None
    previous_voyage_ref: Optional[uuid.UUID] = None
    voyage_instructions: Optional[str] = None
    ops_notes: Optional[str] = None
    expected_completing_manual_override: Optional[bool] = None
    expected_completing_datetime: Optional[datetime] = None
    terms: Optional[VoyageTermsDTO] = None
    # M1 Voyage Core fields
    ops_coordinator_user_id: Optional[str] = None
    trade_area: Optional[str] = None
    lob: Optional[str] = None
    is_pool: Optional[bool] = None
    is_ice_class: Optional[bool] = None
    is_clean: Optional[bool] = None
    is_coated: Optional[bool] = None


class ItineraryLineResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    sequence_no: int
    port_ref: uuid.UUID
    port_function: str
    planned_eta: datetime
    planned_etd: datetime
    speed_kts: Optional[Decimal] = None
    distance_nm: Optional[Decimal] = None
    eca_nm: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def port_days(self) -> float:
        return (self.planned_etd - self.planned_eta).total_seconds() / 86400

    @computed_field
    @property
    def sea_days(self) -> Optional[float]:
        if self.distance_nm and self.speed_kts and self.speed_kts > 0:
            return float(self.distance_nm) / (float(self.speed_kts) * 24)
        return None


class VoyageResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_no: str
    vessel_ref: uuid.UUID
    charterer_ref: Optional[uuid.UUID] = None
    status: str
    commencing_datetime: datetime
    expected_completing_datetime: Optional[datetime] = None
    expected_completing_manual_override: bool
    previous_voyage_ref: Optional[uuid.UUID] = None
    voyage_instructions: Optional[str] = None
    ops_notes: Optional[str] = None
    commenced_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # M1 Voyage Core fields
    ops_coordinator_user_id: Optional[str] = None
    trade_area: Optional[str] = None
    lob: Optional[str] = None
    is_pool: bool = False
    is_ice_class: bool = False
    is_clean: bool = False
    is_coated: bool = False
    terms: Optional[VoyageTermsDTO] = None
    itinerary_lines: List[ItineraryLineResponseDTO] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def nest_terms(cls, data: object) -> object:
        if isinstance(data, dict):
            data_dict = dict(data)
            if "terms" not in data_dict:
                data_dict["terms"] = {
                    "charterer_name": data_dict.get("terms_charterer_name"),
                    "cp_type": data_dict.get("terms_cp_type"),
                    "cp_date": data_dict.get("terms_cp_date"),
                    "cp_document_ref": data_dict.get("terms_cp_document_ref"),
                }
            return data_dict
        else:
            # SQLAlchemy model instance
            terms_dict = {
                "charterer_name": getattr(data, "terms_charterer_name", None),
                "cp_type": getattr(data, "terms_cp_type", None),
                "cp_date": getattr(data, "terms_cp_date", None),
                "cp_document_ref": getattr(data, "terms_cp_document_ref", None),
            }
            # Check if any field is populated, otherwise keep it None
            has_terms = any(val is not None for val in terms_dict.values())

            data_dict = {
                "id": getattr(data, "id"),
                "voyage_no": getattr(data, "voyage_no"),
                "vessel_ref": getattr(data, "vessel_ref"),
                "charterer_ref": getattr(data, "charterer_ref", None),
                "status": getattr(data, "status"),
                "commencing_datetime": getattr(data, "commencing_datetime"),
                "expected_completing_datetime": getattr(
                    data, "expected_completing_datetime", None
                ),
                "expected_completing_manual_override": getattr(
                    data, "expected_completing_manual_override"
                ),
                "previous_voyage_ref": getattr(data, "previous_voyage_ref", None),
                "voyage_instructions": getattr(data, "voyage_instructions", None),
                "ops_notes": getattr(data, "ops_notes", None),
                "commenced_at": getattr(data, "commenced_at", None),
                "completed_at": getattr(data, "completed_at", None),
                "closed_at": getattr(data, "closed_at", None),
                "cancelled_at": getattr(data, "cancelled_at", None),
                "created_at": getattr(data, "created_at"),
                "updated_at": getattr(data, "updated_at"),
                "ops_coordinator_user_id": getattr(
                    data, "ops_coordinator_user_id", None
                ),
                "trade_area": getattr(data, "trade_area", None),
                "lob": getattr(data, "lob", None),
                "is_pool": getattr(data, "is_pool", False),
                "is_ice_class": getattr(data, "is_ice_class", False),
                "is_clean": getattr(data, "is_clean", False),
                "is_coated": getattr(data, "is_coated", False),
                "terms": terms_dict if has_terms else None,
                "itinerary_lines": [
                    ItineraryLineResponseDTO.model_validate(line)
                    for line in getattr(data, "itinerary_lines", [])
                ],
            }
            return data_dict


class ItineraryLineCreateDTO(BaseModel):
    port_ref: uuid.UUID
    port_function: str
    planned_eta: datetime
    planned_etd: datetime
    sequence_no: Optional[int] = None
    speed_kts: Optional[float] = None
    distance_nm: Optional[float] = None
    eca_nm: Optional[float] = None


class ItineraryLineUpdateDTO(BaseModel):
    port_ref: Optional[uuid.UUID] = None
    port_function: Optional[str] = None
    planned_eta: Optional[datetime] = None
    planned_etd: Optional[datetime] = None
    sequence_no: Optional[int] = None
    speed_kts: Optional[float] = None
    distance_nm: Optional[float] = None
    eca_nm: Optional[float] = None


class VoyageStatusTransitionDTO(BaseModel):
    to: str


# --- Routes ---


@router.post("", response_model=VoyageResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_voyage(
    data: VoyageCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VoyageResponseDTO:
    service = VoyageService(session)
    create_data: VoyageCreateData = {
        "voyage_no": data.voyage_no,
        "vessel_ref": data.vessel_ref,
        "commencing_datetime": data.commencing_datetime,
        "charterer_ref": data.charterer_ref,
        "previous_voyage_ref": data.previous_voyage_ref,
        "voyage_instructions": data.voyage_instructions,
        "ops_notes": data.ops_notes,
        "ops_coordinator_user_id": data.ops_coordinator_user_id,
        "trade_area": data.trade_area,
        "lob": data.lob,
        "is_pool": data.is_pool,
        "is_ice_class": data.is_ice_class,
        "is_clean": data.is_clean,
        "is_coated": data.is_coated,
    }
    if data.status is not None:
        create_data["status"] = data.status
    if data.terms:
        create_data["terms"] = {
            "charterer_name": data.terms.charterer_name,
            "cp_type": data.terms.cp_type,
            "cp_date": data.terms.cp_date,
            "cp_document_ref": data.terms.cp_document_ref,
        }
    voyage = await service.create(create_data)
    return VoyageResponseDTO.model_validate(voyage)


@router.get("", response_model=List[VoyageResponseDTO])
async def list_voyages(
    vessel_ref: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    charterer_ref: Optional[uuid.UUID] = None,
    ops_coordinator_user_id: Optional[str] = None,
    trade_area: Optional[str] = None,
    commencing_start: Optional[datetime] = None,
    commencing_end: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[VoyageResponseDTO]:
    service = VoyageService(session)
    voyages = await service.list(
        vessel_ref=vessel_ref,
        status=status,
        charterer_ref=charterer_ref,
        ops_coordinator_user_id=ops_coordinator_user_id,
        trade_area=trade_area,
        commencing_start=commencing_start,
        commencing_end=commencing_end,
        limit=limit,
        offset=offset,
    )
    return [VoyageResponseDTO.model_validate(v) for v in voyages]


@router.get("/{voyage_id}", response_model=VoyageResponseDTO)
async def get_voyage(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VoyageResponseDTO:
    service = VoyageService(session)
    voyage = await service.get(voyage_id)
    return VoyageResponseDTO.model_validate(voyage)


@router.patch("/{voyage_id}", response_model=VoyageResponseDTO)
async def update_voyage(
    voyage_id: uuid.UUID,
    data: VoyageUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VoyageResponseDTO:
    service = VoyageService(session)
    update_data: VoyageUpdateData = {}

    if data.voyage_no is not None:
        update_data["voyage_no"] = data.voyage_no
    if data.vessel_ref is not None:
        update_data["vessel_ref"] = data.vessel_ref
    if data.commencing_datetime is not None:
        update_data["commencing_datetime"] = data.commencing_datetime
    if data.charterer_ref is not None:
        update_data["charterer_ref"] = data.charterer_ref
    if data.previous_voyage_ref is not None:
        update_data["previous_voyage_ref"] = data.previous_voyage_ref
    if data.voyage_instructions is not None:
        update_data["voyage_instructions"] = data.voyage_instructions
    if data.ops_notes is not None:
        update_data["ops_notes"] = data.ops_notes
    if data.expected_completing_manual_override is not None:
        update_data["expected_completing_manual_override"] = (
            data.expected_completing_manual_override
        )
    if data.expected_completing_datetime is not None:
        update_data["expected_completing_datetime"] = data.expected_completing_datetime
    if data.ops_coordinator_user_id is not None:
        update_data["ops_coordinator_user_id"] = data.ops_coordinator_user_id
    if data.trade_area is not None:
        update_data["trade_area"] = data.trade_area
    if data.lob is not None:
        update_data["lob"] = data.lob
    if data.is_pool is not None:
        update_data["is_pool"] = data.is_pool
    if data.is_ice_class is not None:
        update_data["is_ice_class"] = data.is_ice_class
    if data.is_clean is not None:
        update_data["is_clean"] = data.is_clean
    if data.is_coated is not None:
        update_data["is_coated"] = data.is_coated

    if data.terms:
        update_data["terms"] = {
            "charterer_name": data.terms.charterer_name,
            "cp_type": data.terms.cp_type,
            "cp_date": data.terms.cp_date,
            "cp_document_ref": data.terms.cp_document_ref,
        }

    voyage = await service.update(voyage_id, update_data)
    return VoyageResponseDTO.model_validate(voyage)


@router.post("/{voyage_id}/transition", response_model=VoyageResponseDTO)
async def transition_voyage_status(
    voyage_id: uuid.UUID,
    data: VoyageStatusTransitionDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> VoyageResponseDTO:
    service = VoyageService(session)
    voyage = await service.transition_status(voyage_id, data.to)
    return VoyageResponseDTO.model_validate(voyage)


@router.post(
    "/{voyage_id}/itinerary",
    response_model=ItineraryLineResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def insert_itinerary_line(
    voyage_id: uuid.UUID,
    data: ItineraryLineCreateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> ItineraryLineResponseDTO:
    service = VoyageService(session)
    create_data: ItineraryLineCreateData = {
        "port_ref": data.port_ref,
        "port_function": data.port_function,
        "planned_eta": data.planned_eta,
        "planned_etd": data.planned_etd,
        "sequence_no": data.sequence_no,
        "speed_kts": Decimal(str(data.speed_kts)) if data.speed_kts is not None else None,
        "distance_nm": Decimal(str(data.distance_nm)) if data.distance_nm is not None else None,
        "eca_nm": Decimal(str(data.eca_nm)) if data.eca_nm is not None else None,
    }
    line = await service.insert_itinerary_line(voyage_id, create_data)
    return ItineraryLineResponseDTO.model_validate(line)


@router.get("/{voyage_id}/itinerary", response_model=List[ItineraryLineResponseDTO])
async def list_itinerary_lines(
    voyage_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[ItineraryLineResponseDTO]:
    service = VoyageService(session)
    lines = await service.list_itinerary(voyage_id)
    return [ItineraryLineResponseDTO.model_validate(line) for line in lines]


@router.patch(
    "/{voyage_id}/itinerary/{line_id}", response_model=ItineraryLineResponseDTO
)
async def update_itinerary_line(
    voyage_id: uuid.UUID,
    line_id: uuid.UUID,
    data: ItineraryLineUpdateDTO,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> ItineraryLineResponseDTO:
    service = VoyageService(session)
    update_data: ItineraryLineUpdateData = {}

    if data.port_ref is not None:
        update_data["port_ref"] = data.port_ref
    if data.port_function is not None:
        update_data["port_function"] = data.port_function
    if data.planned_eta is not None:
        update_data["planned_eta"] = data.planned_eta
    if data.planned_etd is not None:
        update_data["planned_etd"] = data.planned_etd
    if data.sequence_no is not None:
        update_data["sequence_no"] = data.sequence_no
    if data.speed_kts is not None:
        update_data["speed_kts"] = Decimal(str(data.speed_kts))
    if data.distance_nm is not None:
        update_data["distance_nm"] = Decimal(str(data.distance_nm))
    if data.eca_nm is not None:
        update_data["eca_nm"] = Decimal(str(data.eca_nm))

    line = await service.update_itinerary_line(voyage_id, line_id, update_data)
    return ItineraryLineResponseDTO.model_validate(line)


@router.delete(
    "/{voyage_id}/itinerary/{line_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_itinerary_line(
    voyage_id: uuid.UUID,
    line_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> None:
    service = VoyageService(session)
    await service.delete_itinerary_line(voyage_id, line_id)
