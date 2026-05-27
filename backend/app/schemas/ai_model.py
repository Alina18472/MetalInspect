# schemas/ai_model.py

from pydantic import BaseModel

from typing import Any, Optional, Literal


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

    modes: Optional[dict[str, Any]] = None

    status: Optional[str] = None
    description: Optional[str] = None
    
class AiModelCreate(BaseModel):
    model_key: str
    name: str
    model_type: str
    architecture: str

    weights_path: Optional[str] = None
    classes: Optional[list[str]] = None

    status: str = "available"
    default_mode: Optional[str] = "balanced"

    threshold: Optional[float] = None
    confidence_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None

    modes: Optional[dict[str, Any]] = None
    metrics: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    
class AiModelFullUpdate(BaseModel):
    model_key: Optional[str] = None
    name: Optional[str] = None
    model_type: Optional[str] = None
    architecture: Optional[str] = None

    weights_path: Optional[str] = None
    classes: Optional[list[str]] = None

    status: Optional[str] = None
    default_mode: Optional[str] = None

    threshold: Optional[float] = None
    confidence_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None

    modes: Optional[dict[str, Any]] = None
    description: Optional[str] = None