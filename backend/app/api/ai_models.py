from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.security import get_current_user, require_permission
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.models.ai_model import AiModel
from app.schemas.ai_model import AiModelPublic, AiModelSettingsUpdate
from app.services.ai_service import ai_service

router = APIRouter(prefix="/ai/models", tags=["ai-models"])


@router.get("", response_model=List[AiModelPublic])
def list_ai_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает список всех моделей из реестра.
    Активная модель выводится первой.
    """
    models = (
        db.query(AiModel)
        .order_by(AiModel.is_active.desc(), AiModel.id.asc())
        .all()
    )

    return models


@router.get("/active", response_model=AiModelPublic)
def get_active_ai_model(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает текущую активную модель.
    """
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
    """
    Делает выбранную модель активной.

    Пока разрешаем активировать только модели со status='available'.
    Например, YOLO со status='planned' нельзя активировать, пока она реально не подключена.
    """
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")

    if model.status != "available":
        raise HTTPException(
            status_code=400,
            detail=f"Model cannot be activated because status is '{model.status}'"
        )

    if not model.weights_path:
        raise HTTPException(
            status_code=400,
            detail="Model cannot be activated because weights_path is empty"
        )

    # Делаем все модели неактивными
    db.query(AiModel).update({AiModel.is_active: False})

    # Активируем выбранную
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
    """
    Обновляет настройки модели:
    - default_mode;
    - threshold;
    - confidence_threshold;
    - iou_threshold;
    - status;
    - description.
    """
    model = db.query(AiModel).filter(AiModel.id == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="AI model not found")

    allowed_statuses = {"available", "planned", "disabled", "error"}

    if data.status is not None:
        if data.status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {sorted(allowed_statuses)}"
            )
        model.status = data.status

        # Если модель отключили, она не должна оставаться активной
        if data.status in {"planned", "disabled", "error"}:
            model.is_active = False

    if data.default_mode is not None:
        if model.modes and data.default_mode not in model.modes:
            raise HTTPException(
                status_code=400,
                detail=f"Mode '{data.default_mode}' not found in model modes"
            )

        model.default_mode = data.default_mode

        # Если для режима есть threshold, автоматически ставим его
        if model.modes and data.default_mode in model.modes:
            mode_value = model.modes[data.default_mode]

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
    """
    Возвращает информацию о реально загруженной модели в ai_service.
    """
    return ai_service.get_active_model_runtime_info()