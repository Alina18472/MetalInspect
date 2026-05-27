
# api/ai_models.py

from pathlib import Path
from copy import deepcopy
from typing import List
from app.services.shift_runtime_service import shift_runtime_service
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_permission
from app.models.ai_model import AiModel
from app.models.inspection import Inspection
from app.models.user import User
from app.schemas.ai_model import (
    AiModelPublic,
    AiModelSettingsUpdate,
    AiModelCreate,
    AiModelFullUpdate,
)
from app.services.ai_service import ai_service


router = APIRouter(prefix="/ai/models", tags=["ai-models"])

BACKEND_DIR = Path(__file__).resolve().parents[2]

ALLOWED_MODEL_TYPES = {"classification", "detection"}
ALLOWED_STATUSES = {"available", "experimental", "planned", "disabled", "error"}
INACTIVE_STATUSES = {"planned", "disabled", "error"}
ALLOWED_MODES = {"strict", "balanced", "sensitive"}


def resolve_model_weights_path(weights_path: str) -> Path:
    path = Path(weights_path)

    if path.is_absolute():
        return path

    return BACKEND_DIR / path


def validate_probability(value, field_name: str):
    if value is None:
        return

    try:
        number_value = float(value)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be number",
        )

    if not 0 <= number_value <= 1:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be in range 0..1",
        )


def validate_int_range(value, field_name: str, min_value: int, max_value: int):
    if value is None:
        return

    try:
        number_value = int(value)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be integer",
        )

    if number_value < min_value or number_value > max_value:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be in range {min_value}..{max_value}",
        )


def validate_modes(modes: dict | None, model_type: str):
    if modes is None:
        return

    if not isinstance(modes, dict):
        raise HTTPException(status_code=400, detail="modes must be object")

    for mode_key, mode_value in modes.items():
        if mode_key not in ALLOWED_MODES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid mode '{mode_key}'. "
                    "Allowed: strict, balanced, sensitive"
                ),
            )
        if isinstance(mode_value, (int, float, str)):
            validate_probability(mode_value, f"modes.{mode_key}")
            continue
        if not isinstance(mode_value, dict):
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{mode_key}' must be object or number",
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
            validate_int_range(
                mode_value.get("imgsz"),
                f"modes.{mode_key}.imgsz",
                160,
                1280,
            )
            validate_int_range(
                mode_value.get("max_det"),
                f"modes.{mode_key}.max_det",
                1,
                300,
            )

def validate_weights_if_required(model: AiModel):
    if model.status not in {"available", "experimental"}:
        return

    if not model.weights_path:
        raise HTTPException(
            status_code=400,
            detail="weights_path is required for available or experimental model",
        )

    weights_path = resolve_model_weights_path(model.weights_path)

    if not weights_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Model weights file not found: {weights_path}",
        )


def apply_default_mode_thresholds(model: AiModel):
    if not model.default_mode or not model.modes:
        return

    if model.default_mode not in model.modes:
        raise HTTPException(
            status_code=400,
            detail=f"Mode '{model.default_mode}' not found in model modes",
        )

    mode_value = model.modes[model.default_mode]

    if not isinstance(mode_value, dict):
        if model.model_type == "classification":
            model.threshold = float(mode_value)
            model.confidence_threshold = None
            model.iou_threshold = None

        if model.model_type == "detection":
            model.threshold = None
            model.confidence_threshold = float(mode_value)

        return

    if model.model_type == "classification":
        threshold_value = mode_value.get("threshold")

        if threshold_value is not None:
            model.threshold = float(threshold_value)

        model.confidence_threshold = None
        model.iou_threshold = None

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

        model.threshold = None


def snapshot_model_values(model: AiModel) -> dict:
    return {
        "model_key": model.model_key,
        "name": model.name,
        "model_type": model.model_type,
        "architecture": model.architecture,
        "weights_path": model.weights_path,
        "classes": deepcopy(model.classes),
        "is_active": model.is_active,
        "status": model.status,
        "default_mode": model.default_mode,
        "threshold": model.threshold,
        "confidence_threshold": model.confidence_threshold,
        "iou_threshold": model.iou_threshold,
        "modes": deepcopy(model.modes),
        "metrics": deepcopy(model.metrics),
        "description": model.description,
    }


def restore_model_values(model: AiModel, old_values: dict):
    for field, value in old_values.items():
        setattr(model, field, value)

def ensure_shift_not_running():
    try:
        status = shift_runtime_service.get_status()
    except Exception:
        return

    if status.get("running"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Нельзя менять активную AI-модель во время запущенной смены. "
                "Сначала остановите смену."
            ),
        )
def schema_to_dict(data):
    if hasattr(data, "model_dump"):
        return data.model_dump(exclude_unset=True)

    return data.dict(exclude_unset=True)


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

    if data.model_type not in ALLOWED_MODEL_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model_type. Allowed: {sorted(ALLOWED_MODEL_TYPES)}",
        )

    if data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
        )

    validate_probability(data.threshold, "threshold")
    validate_probability(data.confidence_threshold, "confidence_threshold")
    validate_probability(data.iou_threshold, "iou_threshold")
    validate_modes(data.modes, data.model_type)

    model = AiModel(
        model_key=data.model_key.strip(),
        name=data.name.strip(),
        model_type=data.model_type,
        architecture=data.architecture.strip(),
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

    if model.model_type == "classification":
        model.confidence_threshold = None
        model.iou_threshold = None

    if model.model_type == "detection":
        model.threshold = None

    apply_default_mode_thresholds(model)
    validate_weights_if_required(model)

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
    ensure_shift_not_running()
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
    if model.is_active:
        ensure_shift_not_running()
    if model.status not in {"available", "experimental"}:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Model cannot be activated because status is '{model.status}'. "
                "Allowed statuses: available, experimental"
            ),
        )

    if model.model_type not in ALLOWED_MODEL_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only classification and detection models can be activated",
        )

    validate_modes(model.modes, model.model_type)
    apply_default_mode_thresholds(model)
    validate_weights_if_required(model)

    # ВАЖНО:
    # Если модель уже активна, не делаем bulk update "все false".
    # Иначе можно случайно оставить БД без активной модели.
    if model.is_active:
        db.commit()
        db.refresh(model)

        try:
            ai_service.reload_active_model()
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Active model exists in DB but could not be loaded in runtime. Error: {e}",
            )

        return model

    old_active_model = (
        db.query(AiModel)
        .filter(AiModel.is_active == True)
        .first()
    )
    old_active_model_id = old_active_model.id if old_active_model else None

    try:
        db.query(AiModel).update(
            {AiModel.is_active: False},
            synchronize_session=False,
        )

        # Ставим активность отдельным UPDATE именно по id,
        # чтобы не зависеть от состояния ORM-объекта в памяти.
        db.query(AiModel).filter(AiModel.id == model_id).update(
            {AiModel.is_active: True},
            synchronize_session=False,
        )

        db.commit()

        model = db.query(AiModel).filter(AiModel.id == model_id).first()
        db.refresh(model)

        ai_service.reload_active_model()

        return model

    except Exception as e:
        db.rollback()

        db.query(AiModel).update(
            {AiModel.is_active: False},
            synchronize_session=False,
        )

        if old_active_model_id is not None:
            db.query(AiModel).filter(AiModel.id == old_active_model_id).update(
                {AiModel.is_active: True},
                synchronize_session=False,
            )

        db.commit()

        try:
            ai_service.reload_active_model()
        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=(
                "Model could not be activated in runtime. "
                "Previous active model was restored if it existed. "
                f"Error: {e}"
            ),
        )


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

    old_values = snapshot_model_values(model)

    if data.status is not None:
        if data.status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
            )

        if model.is_active and data.status in INACTIVE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Active model cannot be moved to planned, disabled or error. "
                    "Activate another model first."
                ),
            )

        model.status = data.status

    if data.modes is not None:
        validate_modes(data.modes, model.model_type)
        model.modes = data.modes

    if data.default_mode is not None:
        model.default_mode = data.default_mode

    if data.threshold is not None:
        validate_probability(data.threshold, "threshold")
        model.threshold = float(data.threshold)

    if data.confidence_threshold is not None:
        validate_probability(data.confidence_threshold, "confidence_threshold")
        model.confidence_threshold = float(data.confidence_threshold)

    if data.iou_threshold is not None:
        validate_probability(data.iou_threshold, "iou_threshold")
        model.iou_threshold = float(data.iou_threshold)

    if data.description is not None:
        model.description = data.description

    validate_modes(model.modes, model.model_type)

    if model.default_mode and model.modes:
        apply_default_mode_thresholds(model)

    if model.model_type == "classification":
        model.confidence_threshold = None
        model.iou_threshold = None

    if model.model_type == "detection":
        model.threshold = None

    validate_weights_if_required(model)

    db.commit()
    db.refresh(model)

    if model.is_active:
        try:
            ai_service.reload_active_model()
        except Exception as e:
            restore_model_values(model, old_values)
            db.commit()

            try:
                ai_service.reload_active_model()
            except Exception:
                pass

            raise HTTPException(
                status_code=500,
                detail=(
                    "Changes were rolled back because active model "
                    f"could not be loaded in runtime. Error: {e}"
                ),
            )

    return model


@router.put("/{model_id}", response_model=AiModelPublic)
def update_ai_model_full(
    model_id: int,
    data: AiModelFullUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.manage")),
):
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")
    if model.is_active:
        ensure_shift_not_running()


    old_values = snapshot_model_values(model)
    payload = schema_to_dict(data)

    if "model_key" in payload:
        new_key = (payload["model_key"] or "").strip()

        if not new_key:
            raise HTTPException(status_code=400, detail="model_key cannot be empty")

        existing = (
            db.query(AiModel)
            .filter(AiModel.model_key == new_key, AiModel.id != model_id)
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"AI model with model_key '{new_key}' already exists",
            )

        model.model_key = new_key

    if "name" in payload:
        new_name = (payload["name"] or "").strip()

        if not new_name:
            raise HTTPException(status_code=400, detail="name cannot be empty")

        model.name = new_name

    if "model_type" in payload:
        if payload["model_type"] not in ALLOWED_MODEL_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model_type. Allowed: {sorted(ALLOWED_MODEL_TYPES)}",
            )

        model.model_type = payload["model_type"]

    if "architecture" in payload:
        new_architecture = (payload["architecture"] or "").strip()

        if not new_architecture:
            raise HTTPException(status_code=400, detail="architecture cannot be empty")

        model.architecture = new_architecture

    if "weights_path" in payload:
        weights_path_value = payload["weights_path"]

        if weights_path_value is None:
            model.weights_path = None
        else:
            model.weights_path = str(weights_path_value).strip() or None

    if "classes" in payload:
        model.classes = payload["classes"]

    if "status" in payload:
        if payload["status"] not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(ALLOWED_STATUSES)}",
            )

        if model.is_active and payload["status"] in INACTIVE_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Active model cannot be moved to planned, disabled or error. "
                    "Activate another model first."
                ),
            )

        model.status = payload["status"]

    if "default_mode" in payload:
        model.default_mode = payload["default_mode"]

    if "threshold" in payload:
        validate_probability(payload["threshold"], "threshold")
        model.threshold = payload["threshold"]

    if "confidence_threshold" in payload:
        validate_probability(payload["confidence_threshold"], "confidence_threshold")
        model.confidence_threshold = payload["confidence_threshold"]

    if "iou_threshold" in payload:
        validate_probability(payload["iou_threshold"], "iou_threshold")
        model.iou_threshold = payload["iou_threshold"]

    if "modes" in payload:
        validate_modes(payload["modes"], model.model_type)
        model.modes = payload["modes"]

    if "description" in payload:
        model.description = payload["description"]

    validate_modes(model.modes, model.model_type)

    if model.default_mode and model.modes:
        apply_default_mode_thresholds(model)

    if model.model_type == "classification":
        model.confidence_threshold = None
        model.iou_threshold = None

    if model.model_type == "detection":
        model.threshold = None

    validate_weights_if_required(model)

    db.commit()
    db.refresh(model)

    if model.is_active:
        try:
            ai_service.reload_active_model()
        except Exception as e:
            restore_model_values(model, old_values)
            db.commit()

            try:
                ai_service.reload_active_model()
            except Exception:
                pass

            raise HTTPException(
                status_code=500,
                detail=(
                    "Changes were rolled back because active model "
                    f"could not be loaded in runtime. Error: {e}"
                ),
            )

    return model


@router.delete("/{model_id}")
def delete_ai_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("ai_models.manage")),
):
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")

    if model.is_active:
        raise HTTPException(
            status_code=400,
            detail="Active model cannot be deleted. Activate another model first.",
        )

    used_in_inspections = (
        db.query(Inspection.id)
        .filter(Inspection.ai_model_id == model_id)
        .first()
    )

    if used_in_inspections:
        raise HTTPException(
            status_code=400,
            detail=(
                "Model cannot be deleted because it was already used in inspections. "
                "Set status to disabled instead."
            ),
        )

    deleted_name = model.name

    db.delete(model)
    db.commit()

    return {
        "ok": True,
        "message": f"AI model '{deleted_name}' deleted",
    }


@router.get("/active/runtime")
def get_active_model_runtime(
    current_user: User = Depends(get_current_user),
):
    return ai_service.get_active_model_runtime_info()