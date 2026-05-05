from typing import Any, Optional

from pydantic import BaseModel


class AiModelPublic(BaseModel):
    id: int
    model_key: str
    name: str
    model_type: str
    architecture: str

    weights_path: Optional[str] = None
    classes: Optional[list[str]] = None

    is_active: bool
    status: str

    default_mode: Optional[str] = None
    threshold: Optional[float] = None
    confidence_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None

    modes: Optional[dict[str, Any]] = None
    metrics: Optional[dict[str, Any]] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class AiModelSettingsUpdate(BaseModel):
    default_mode: Optional[str] = None

    threshold: Optional[float] = None
    confidence_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None

    status: Optional[str] = None
    description: Optional[str] = None