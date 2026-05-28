from datetime import date, datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict


class VesselHeaderDTO(BaseModel):
    id: uuid.UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class WorkspaceItineraryItemDTO(BaseModel):
    sequence_no: int
    port_code: str
    planned_eta: datetime
    planned_etd: datetime

    model_config = ConfigDict(from_attributes=True)


class VoyageWorkspaceResponse(BaseModel):
    voyage_id: uuid.UUID
    voyage_no: str
    status: str
    vessel: VesselHeaderDTO
    charterer: Optional[str] = None
    cp_type: Optional[str] = None
    cp_date: Optional[date] = None
    cp_document_ref: Optional[str] = None
    commencing_datetime: datetime
    expected_completing_datetime: Optional[datetime] = None
    itinerary: List[WorkspaceItineraryItemDTO]
    voyage_instructions: Optional[str] = None
    ops_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
