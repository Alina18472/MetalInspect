# api/ai_models.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.security import get_current_user, require_permission
from app.core.database import get_db
from app.core.security import  require_admin
from app.models.user import User
from app.models.ai_model import AiModel
from app.schemas.ai_model import AiModelPublic, AiModelSettingsUpdate, AiModelCreate
from app.services.ai_service import ai_service
from pathlib import Path

router = APIRouter(prefix="/ai/models", tags=["ai-models"])
BACKEND_DIR = Path(__file__).resolve().parents[2]


def resolve_model_weights_path(weights_path: str) -> Path:
    path = Path(weights_path)

    if path.is_absolute():
        return path

    return BACKEND_DIR / path

@router.get("", response_model=List[AiModelPublic])
def list_ai_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.view")),
):
  
    models = (
        db.query(AiModel)
        .order_by(AiModel.is_active.desc(), AiModel.id.asc())
        .all()
    )

    return models

@router.post("", response_model=AiModelPublic)
def create_ai_model(
    data: AiModelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.manage")),
):
   
    existing = (
        db.query(AiModel)
        .filter(AiModel.model_key == data.model_key)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"AI model with model_key '{data.model_key}' already exists",
        )

    allowed_types = {"classification", "detection"}
    if data.model_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_type. Allowed: {sorted(allowed_types)}",
        )

    allowed_statuses = {"available", "experimental", "planned", "disabled", "error"}
    if data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(allowed_statuses)}",
        )

    if data.threshold is not None:
        if not 0 <= float(data.threshold) <= 1:
            raise HTTPException(
                status_code=400,
                detail="threshold must be in range 0..1",
            )

    if data.confidence_threshold is not None:
        if not 0 <= float(data.confidence_threshold) <= 1:
            raise HTTPException(
                status_code=400,
                detail="confidence_threshold must be in range 0..1",
            )

    if data.iou_threshold is not None:
        if not 0 <= float(data.iou_threshold) <= 1:
            raise HTTPException(
                status_code=400,
                detail="iou_threshold must be in range 0..1",
            )

    if data.status in {"available", "experimental"}:
        if not data.weights_path:
            raise HTTPException(
                status_code=400,
                detail="weights_path is required for available or experimental model",
            )

        weights_path = resolve_model_weights_path(data.weights_path)

        if not weights_path.exists():
            raise HTTPException(
                status_code=400,
                detail=f"Model weights file not found: {weights_path}",
            )
    validate_modes(data.modes, data.model_type)
    model = AiModel(
        model_key=data.model_key,
        name=data.name,
        model_type=data.model_type,
        architecture=data.architecture,
        weights_path=data.weights_path,
        classes=data.classes,
        status=data.status,
        is_active=False,
        default_mode=data.default_mode,
        threshold=data.threshold,
        confidence_threshold=data.confidence_threshold,
        iou_threshold=data.iou_threshold,
        modes=data.modes,
        metrics=data.metrics,
        description=data.description,
    )

    db.add(model)
    db.commit()
    db.refresh(model)

    return model
@router.get("/active", response_model=AiModelPublic)
def get_active_ai_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.view")),
):
   
    model = db.query(AiModel).filter(AiModel.is_active == True).first()

    if not model:
        raise HTTPException(status_code=404, detail="Active AI model not found")

    return model


@router.post("/{model_id}/activate", response_model=AiModelPublic)
def activate_ai_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.manage")),
):
   
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")

    if model.status not in {"available", "experimental"}:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Model cannot be activated because status is '{model.status}'. "
                "Allowed statuses: available, experimental"
            ),
        )

    if model.model_type not in {"classification", "detection"}:
        raise HTTPException(
            status_code=400,
            detail="Only classification and detection models can be activated",
        )

    if not model.weights_path:
        raise HTTPException(
            status_code=400,
            detail="Model cannot be activated because weights_path is empty",
        )

    weights_path = resolve_model_weights_path(model.weights_path)

    if not weights_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Model weights file not found: {weights_path}",
        )

    db.query(AiModel).update({AiModel.is_active: False})

    model.is_active = True

    db.commit()
    db.refresh(model)
    ai_service.reload_active_model()

    return model


@router.put("/{model_id}/settings", response_model=AiModelPublic)
def update_ai_model_settings(
    model_id: int,
    data: AiModelSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.manage")),
):
  
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")

    allowed_statuses = {"available", "experimental", "planned", "disabled", "error"}

    if data.status is not None:
        if data.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(allowed_statuses)}"
            )

        inactive_statuses = {"planned", "disabled", "error"}

        if model.is_active and data.status in inactive_statuses:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Active model cannot be moved to planned, disabled or error. "
                    "Activate another model first."
                ),
            )

        model.status = data.status

    if data.default_mode is not None:
        if model.modes and data.default_mode not in model.modes:
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{data.default_mode}' not found in model modes"
            )

        model.default_mode = data.default_mode

        if model.modes and data.default_mode in model.modes:
            mode_value = model.modes[data.default_mode]

            if isinstance(mode_value, dict):
                if model.model_type == "classification":
                    threshold_value = mode_value.get("threshold")

                    if threshold_value is not None:
                        model.threshold = float(threshold_value)

                if model.model_type == "detection":
                    confidence_value = (
                        mode_value.get("confidence_threshold")
                        or mode_value.get("threshold")
                    )
                    iou_value = mode_value.get("iou_threshold")

                    if confidence_value is not None:
                        model.confidence_threshold = float(confidence_value)

                    if iou_value is not None:
                        model.iou_threshold = float(iou_value)

            else:
                if model.model_type == "classification":
                    model.threshold = float(mode_value)

                if model.model_type == "detection":
                    model.confidence_threshold = float(mode_value)

    if data.threshold is not None:
        if not 0 <= float(data.threshold) <= 1:
            raise HTTPException(status_code=400, detail="threshold must be in range 0..1")
        model.threshold = float(data.threshold)

    if data.confidence_threshold is not None:
        if not 0 <= float(data.confidence_threshold) <= 1:
            raise HTTPException(status_code=400, detail="confidence_threshold must be in range 0..1")
        model.confidence_threshold = float(data.confidence_threshold)

    if data.iou_threshold is not None:
        if not 0 <= float(data.iou_threshold) <= 1:
            raise HTTPException(status_code=400, detail="iou_threshold must be in range 0..1")
        model.iou_threshold = float(data.iou_threshold)

    if data.description is not None:
        model.description = data.description

    db.commit()
    db.refresh(model)
    if model.is_active:
        ai_service.reload_active_model()

    return model

@router.get("/active/runtime")
def get_active_model_runtime(
    current_user: User = Depends(get_current_user),
):
    return ai_service.get_active_model_runtime_info()

def validate_probability(value, field_name: str):
    if value is None:
        return

    if not 0 <= float(value) <= 1:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be in range 0..1",
        )


def validate_modes(modes: dict | None, model_type: str):
    if modes is None:
        return

    if not isinstance(modes, dict):
        raise HTTPException(status_code=400, detail="modes must be object")

    for mode_key, mode_value in modes.items():
        if mode_key not in {"strict", "balanced", "sensitive"}:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid mode '{mode_key}'. Allowed: strict, balanced, sensitive",
            )

        if not isinstance(mode_value, dict):
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{mode_key}' must be object",
            )

        if model_type == "classification":
            validate_probability(
                mode_value.get("threshold"),
                f"modes.{mode_key}.threshold",
            )

        if model_type == "detection":
            validate_probability(
                mode_value.get("confidence_threshold"),
                f"modes.{mode_key}.confidence_threshold",
            )
            validate_probability(
                mode_value.get("iou_threshold"),
                f"modes.{mode_key}.iou_threshold",
            )