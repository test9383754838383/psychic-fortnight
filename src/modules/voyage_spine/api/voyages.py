import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, model_validator
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


class ItineraryLineResponseDTO(BaseModel):
    id: uuid.UUID
    voyage_id: uuid.UUID
    sequence_no: int
    port_ref: uuid.UUID
    port_function: str
    planned_eta: datetime
    planned_etd: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    terms: Optional[VoyageTermsDTO] = None
    itinerary_lines: List[ItineraryLineResponseDTO] = []

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def nest_terms(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "terms" not in data:
                data["terms"] = {
                    "charterer_name": data.get("terms_charterer_name"),
                    "cp_type": data.get("terms_cp_type"),
                    "cp_date": data.get("terms_cp_date"),
                    "cp_document_ref": data.get("terms_cp_document_ref"),
                }
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
                "id": data.id,
                "voyage_no": data.voyage_no,
                "vessel_ref": data.vessel_ref,
                "charterer_ref": data.charterer_ref,
                "status": data.status,
                "commencing_datetime": data.commencing_datetime,
                "expected_completing_datetime": data.expected_completing_datetime,
                "expected_completing_manual_override": data.expected_completing_manual_override,
                "previous_voyage_ref": data.previous_voyage_ref,
                "voyage_instructions": data.voyage_instructions,
                "ops_notes": data.ops_notes,
                "commenced_at": data.commenced_at,
                "completed_at": data.completed_at,
                "closed_at": data.closed_at,
                "cancelled_at": data.cancelled_at,
                "created_at": data.created_at,
                "updated_at": data.updated_at,
                "terms": terms_dict if has_terms else None,
                "itinerary_lines": [
                    ItineraryLineResponseDTO.model_validate(line)
                    for line in getattr(data, "itinerary_lines", [])
                ],
            }
            return data_dict
        return data


class ItineraryLineCreateDTO(BaseModel):
    port_ref: uuid.UUID
    port_function: str
    planned_eta: datetime
    planned_etd: datetime
    sequence_no: Optional[int] = None


class ItineraryLineUpdateDTO(BaseModel):
    port_ref: Optional[uuid.UUID] = None
    port_function: Optional[str] = None
    planned_eta: Optional[datetime] = None
    planned_etd: Optional[datetime] = None
    sequence_no: Optional[int] = None


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
    }
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
    commencing_start: Optional[datetime] = None,
    commencing_end: Optional[datetime] = None,
    session: AsyncSession = Depends(get_db_session),
    current_user: str = Depends(get_current_user),
) -> List[VoyageResponseDTO]:
    service = VoyageService(session)
    voyages = await service.list(
        vessel_ref=vessel_ref,
        status=status,
        charterer_ref=charterer_ref,
        commencing_start=commencing_start,
        commencing_end=commencing_end,
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

    for field in [
        "voyage_no",
        "vessel_ref",
        "commencing_datetime",
        "charterer_ref",
        "previous_voyage_ref",
        "voyage_instructions",
        "ops_notes",
        "expected_completing_manual_override",
        "expected_completing_datetime",
    ]:
        val = getattr(data, field, None)
        if val is not None:
            update_data[field] = val  # type: ignore

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

    for field in [
        "port_ref",
        "port_function",
        "planned_eta",
        "planned_etd",
        "sequence_no",
    ]:
        val = getattr(data, field, None)
        if val is not None:
            update_data[field] = val  # type: ignore

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
