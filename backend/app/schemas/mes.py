from typing import Optional, Any
from pydantic import BaseModel


class MesDefectPayload(BaseModel):
    defect_id: int
    inspection_id: int
    shift_id: Optional[int] = None

    ingot_id: Optional[str] = None
    source_ingot_id: Optional[str] = None

    defect_type: str = "crack"
    confidence: Optional[float] = None
    max_p_crack: Optional[float] = None
    threshold: Optional[float] = None
    verdict: Optional[str] = None

    ai_model_key: Optional[str] = None
    ai_model_name: Optional[str] = None
    ai_model_type: Optional[str] = None
    ai_model_architecture: Optional[str] = None

    sent_by: Optional[int] = None


class MesResponse(BaseModel):
    success: bool
    mes_event_id: str
    mes_status: str
    message: str
    payload: dict[str, Any]