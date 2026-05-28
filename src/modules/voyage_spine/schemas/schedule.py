from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict


class PortSequenceItemDTO(BaseModel):
    port_code: str
    planned_eta: datetime
    planned_etd: datetime

    model_config = ConfigDict(from_attributes=True)


class VoyageBarDTO(BaseModel):
    voyage_id: uuid.UUID
    voyage_no: str
    status: str
    commencing_datetime: datetime
    expected_completing_datetime: Optional[datetime] = None
    current_next_port_code: Optional[str] = None
    charterer: Optional[str] = None
    port_sequence: List[PortSequenceItemDTO]

    model_config = ConfigDict(from_attributes=True)


class VesselScheduleItemDTO(BaseModel):
    vessel_id: uuid.UUID
    vessel_name: str
    voyages: List[VoyageBarDTO]

    model_config = ConfigDict(from_attributes=True)


class VesselScheduleResponse(BaseModel):
    vessels: List[VesselScheduleItemDTO]

    model_config = ConfigDict(from_attributes=True)
