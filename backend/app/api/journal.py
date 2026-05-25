from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.mes import MesDefectPayload
from app.services.mes_service import mock_mes_service
from app.models.user import User
from app.models.inspection import Inspection
from app.models.defect import Defect
from app.models.image import Image as InspectionImage
from app.services.storage_service import storage_service
from app.core.security import get_current_user, require_permission
router = APIRouter(prefix="/journal", tags=["journal"])
def user_display_name(user: User | None) -> str | None:
    if not user:
        return None

    parts = [
        user.last_name,
        user.first_name,
        user.patronymic,
    ]

    full_name = " ".join([p for p in parts if p])

    if full_name:
        return full_name

    return user.email or f"Пользователь #{user.id}"

def date_start(value: Optional[date]):
    if value is None:
        return None
    return datetime.combine(value, time.min)


def date_end_exclusive(value: Optional[date]):
    if value is None:
        return None
    return datetime.combine(value + timedelta(days=1), time.min)


def media_path_to_url(file_path: str | None) -> str | None:
    if not file_path:
        return None

    normalized = file_path.replace("\\", "/")
    marker = "/media/"

    if marker in normalized:
        return normalized[normalized.index(marker):]

    if normalized.startswith("media/"):
        return "/" + normalized

    return None
def image_to_url(image: InspectionImage | None) -> str | None:
    if not image:
        return None

    object_key = getattr(image, "object_key", None)

    if object_key:
        try:
            return storage_service.get_presigned_url(object_key)
        except Exception:
            return None

    return media_path_to_url(image.file_path)

def inspection_to_dict(inspection: Inspection, db: Session) -> dict:
    defect = (
        db.query(Defect)
        .filter(Defect.inspection_id == inspection.id)
        .first()
    )

    image = None
    if defect:
        image = (
            db.query(InspectionImage)
            .filter(InspectionImage.defect_id == defect.id)
            .order_by(InspectionImage.id.desc())
            .first()
        )

    status = None
    creator = None
    if inspection.created_by:
        creator = db.query(User).filter(User.id == inspection.created_by).first()

    creator_name = user_display_name(creator)

    reviewer = None
    if defect and defect.confirmed_by:
        reviewer = db.query(User).filter(User.id == defect.confirmed_by).first()

    reviewer_name = user_display_name(reviewer)
    
   

  
    comment = None
    defect_id = None

    if defect:
        defect_id = defect.id
        status = getattr(defect, "status", None) or (
            "confirmed" if defect.is_confirmed else "pending"
        )
        comment = getattr(defect, "comment", None)
    else:
        status = "ok"
        comment = "Дефект не обнаружен"
        
    reviewer = None

    if defect and defect.confirmed_by:
        reviewer = db.query(User).filter(User.id == defect.confirmed_by).first()

    reviewer_name = user_display_name(reviewer)

    if defect and status in ("confirmed", "rejected", "sent_to_mes") and reviewer_name:
        operator = reviewer_name
    else:
        operator = "Автоматически"

    return {
        "inspection_id": inspection.id,
        "shift_id": inspection.shift_id,

        "time": inspection.finished_at.isoformat(timespec="seconds")
        if inspection.finished_at
        else inspection.started_at.isoformat(timespec="seconds")
        if inspection.started_at
        else None,

        "ingot_id": inspection.ingot_id,
        "verdict": inspection.verdict,
        "has_defect": bool(inspection.has_defect),

        "confidence": float(inspection.confidence or 0),
        "max_p_crack": float(inspection.max_p_crack or 0),
        "threshold": float(inspection.threshold or 0),
        "mode": inspection.mode,
        "frames_count": inspection.frames_count,

        "defect_id": defect_id,
        "defect_type": defect.defect_type if defect else None,
        "defect_status": status,
        "comment": comment,
        "ai_model_id": inspection.ai_model_id,
        "ai_model_key": inspection.ai_model_key,
        "ai_model_name": inspection.ai_model_name,
        "ai_model_type": inspection.ai_model_type,
        "ai_model_architecture": inspection.ai_model_architecture,

        "best_frame_url": image_to_url(image),
        "bbox": defect.bbox if defect else None,
        "detections": defect.detections if defect else [],
        "bbox_count": defect.bbox_count if defect else 0,
        "source_ingot_id": inspection.source_ingot_id,
        "cycle_number": inspection.cycle_number,
        "sequence_number": inspection.sequence_number,

        "operator": operator,
        "status_changed_by": reviewer_name,
        "status_changed_by_id": defect.confirmed_by if defect else None,
        "confirmed_at": defect.confirmed_at.isoformat(timespec="seconds")
        if defect and defect.confirmed_at
        else None,
    }


@router.get("/inspections")
def get_inspections_journal(
    limit: int = Query(default=100, ge=1, le=500),
    shift_id: Optional[int] = Query(default=None),
    verdict: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("journal.view")),
):
    query = db.query(Inspection)

    if shift_id:
        query = query.filter(Inspection.shift_id == shift_id)

    if verdict and verdict != "all":
        query = query.filter(Inspection.verdict == verdict)

    start_dt = date_start(date_from)
    end_dt = date_end_exclusive(date_to)

    if start_dt:
        query = query.filter(Inspection.started_at >= start_dt)

    if end_dt:
        query = query.filter(Inspection.started_at < end_dt)

   

    total = query.count()

    inspections = (
        query
        .order_by(Inspection.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "items": [inspection_to_dict(i, db) for i in inspections],
    }
def defect_to_dict(defect: Defect, db: Session) -> dict:
    inspection = (
        db.query(Inspection)
        .filter(Inspection.id == defect.inspection_id)
        .first()
    )

    image = (
        db.query(InspectionImage)
        .filter(InspectionImage.defect_id == defect.id)
        .order_by(InspectionImage.id.desc())
        .first()
    )

    status = getattr(defect, "status", None) or (
        "confirmed" if defect.is_confirmed else "pending"
    )
    reviewer = None
    if defect.confirmed_by:
        reviewer = db.query(User).filter(User.id == defect.confirmed_by).first()

    reviewer_name = user_display_name(reviewer)
    creator = None
    if inspection and inspection.created_by:
        creator = db.query(User).filter(User.id == inspection.created_by).first()

    creator_name = user_display_name(creator)

    reviewer = None

    if defect.confirmed_by:
        reviewer = db.query(User).filter(User.id == defect.confirmed_by).first()

    reviewer_name = user_display_name(reviewer)

    if status in ("confirmed", "rejected", "sent_to_mes") and reviewer_name:
        operator = reviewer_name
    else:
        operator = "Автоматически"

    comment = getattr(defect, "comment", None)
    if not comment:
        if status == "confirmed":
            comment = "Трещина подтверждена"
        elif status == "rejected":
            comment = "Ложное срабатывание"
        else:
            comment = "Требуется проверка оператором"

    return {
        "id": defect.id,
        "defect_id": defect.id,

        "inspection_id": defect.inspection_id,
        "shift_id": inspection.shift_id if inspection else None,

        "time": defect.created_at.isoformat(timespec="seconds")
        if defect.created_at
        else inspection.finished_at.isoformat(timespec="seconds")
        if inspection and inspection.finished_at
        else None,

        "ingot_id": inspection.ingot_id if inspection else None,

        "defect_type": defect.defect_type or "crack",
        "confidence": float(defect.confidence or 0),

        "max_p_crack": float(inspection.max_p_crack or 0) if inspection else float(defect.confidence or 0),
        "threshold": float(inspection.threshold or 0) if inspection else 0,
        "mode": inspection.mode if inspection else None,
        "frames_count": inspection.frames_count if inspection else None,
        "verdict": inspection.verdict if inspection else "CRACK",

        "status": status,
        "is_confirmed": bool(defect.is_confirmed),
        "operator": operator,
        "status_changed_by": reviewer_name,
        "status_changed_by_id": defect.confirmed_by,
        "confirmed_at": defect.confirmed_at.isoformat(timespec="seconds")
        if defect.confirmed_at
        else None,
        "comment": comment,

        "best_frame_path": image.object_key if image and getattr(image, "object_key", None) else None,
        "best_frame_url": image_to_url(image),
        "ai_model_id": inspection.ai_model_id if inspection else None,
        "ai_model_key": inspection.ai_model_key if inspection else None,
        "ai_model_name": inspection.ai_model_name if inspection else None,
        "ai_model_type": inspection.ai_model_type if inspection else None,
        "ai_model_architecture": inspection.ai_model_architecture if inspection else None,
        "sent_to_mes_at": defect.sent_to_mes_at.isoformat(timespec="seconds")
        if defect.sent_to_mes_at
        else None,

        "mes_status": defect.mes_status,
        "mes_message": defect.mes_message,
        "bbox": defect.bbox,
        "detections": defect.detections or [],
        "bbox_count": defect.bbox_count or 0,
        
        "source_ingot_id": inspection.source_ingot_id if inspection else None,
        "cycle_number": inspection.cycle_number if inspection else None,
        "sequence_number": inspection.sequence_number if inspection else None,
    }


@router.get("")
def get_defects_journal(
    limit: int = Query(default=100, ge=1, le=500),
    shift_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("journal.view")),
):
    query = (
        db.query(Defect)
        .join(Inspection, Defect.inspection_id == Inspection.id)
    )

    if shift_id:
        query = query.filter(Inspection.shift_id == shift_id)

    if status and status != "all":
        query = query.filter(Defect.status == status)

    start_dt = date_start(date_from)
    end_dt = date_end_exclusive(date_to)

    if start_dt:
        query = query.filter(Inspection.started_at >= start_dt)

    if end_dt:
        query = query.filter(Inspection.started_at < end_dt)

   

    total = query.count()

    defects = (
        query
        .order_by(Defect.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "items": [defect_to_dict(d, db) for d in defects],
    }

@router.post("/{defect_id}/confirm")
def confirm_defect(
    defect_id: int,
    comment: str = Query(default="Трещина подтверждена"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects.review")),
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()

    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect.status = "confirmed"
    defect.is_confirmed = True
    defect.confirmed_by = current_user.id
    defect.confirmed_at = datetime.utcnow()
    defect.comment = comment

    db.commit()
    db.refresh(defect)

    return {
        "id": defect.id,
        "inspection_id": defect.inspection_id,
        "status": defect.status,
        "is_confirmed": defect.is_confirmed,
        "confirmed_by": defect.confirmed_by,
        "comment": defect.comment,
        "message": "Дефект подтверждён",
    }


@router.post("/{defect_id}/reject")
def reject_defect(
    defect_id: int,
    comment: str = Query(default="Ложное срабатывание"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects.review")),
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()

    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect.status = "rejected"
    defect.is_confirmed = False
    defect.confirmed_by = current_user.id
    defect.confirmed_at = datetime.utcnow()
    defect.comment = comment

    db.commit()
    db.refresh(defect)

    return {
        "id": defect.id,
        "inspection_id": defect.inspection_id,
        "status": defect.status,
        "is_confirmed": defect.is_confirmed,
        "confirmed_by": defect.confirmed_by,
        "comment": defect.comment,
        "message": "Срабатывание отклонено",
    }

@router.post("/{defect_id}/send-to-mes")
def send_defect_to_mes(
    defect_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects.review")),
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()

    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    inspection = (
        db.query(Inspection)
        .filter(Inspection.id == defect.inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    if defect.status == "rejected":
        raise HTTPException(
            status_code=400,
            detail="Отклонённое срабатывание нельзя передать в MES",
        )

    if defect.status == "pending":
        raise HTTPException(
            status_code=400,
            detail="Передать в MES можно только подтверждённый дефект",
        )

    if defect.status == "sent_to_mes":
        return {
            "id": defect.id,
            "inspection_id": defect.inspection_id,
            "status": defect.status,
            "mes_status": defect.mes_status or "accepted",
            "mes_external_id": getattr(defect, "mes_external_id", None),
            "sent_to_mes_at": defect.sent_to_mes_at.isoformat(timespec="seconds")
            if defect.sent_to_mes_at
            else None,
            "mes_message": defect.mes_message or "Дефект уже был передан в MES",
            "message": "Дефект уже был передан в MES",
        }

    mes_payload = MesDefectPayload(
        defect_id=defect.id,
        inspection_id=inspection.id,
        shift_id=inspection.shift_id,
        ingot_id=inspection.ingot_id,
        source_ingot_id=inspection.source_ingot_id,
        defect_type=defect.defect_type or "crack",
        confidence=float(defect.confidence or 0),
        max_p_crack=float(inspection.max_p_crack or 0),
        threshold=float(inspection.threshold or 0),
        verdict=inspection.verdict,
        ai_model_key=inspection.ai_model_key,
        ai_model_name=inspection.ai_model_name,
        ai_model_type=inspection.ai_model_type,
        ai_model_architecture=inspection.ai_model_architecture,
        sent_by=current_user.id,
    )

    try:
        mes_response = mock_mes_service.send_defect(
            db=db,
            payload=mes_payload,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка передачи дефекта в mock-MES: {e}",
        )

    defect.status = "sent_to_mes"
    defect.is_confirmed = True

    if not defect.confirmed_by:
        defect.confirmed_by = current_user.id

    if not defect.confirmed_at:
        defect.confirmed_at = datetime.utcnow()

    defect.sent_to_mes_at = datetime.utcnow()
    defect.mes_status = mes_response.get("mes_status", "accepted")

    if hasattr(defect, "mes_external_id"):
        defect.mes_external_id = mes_response.get("mes_event_id")

    defect.mes_message = mes_response.get(
        "message",
        f"Дефект #{defect.id} передан в mock-MES",
    )

    db.commit()
    db.refresh(defect)

    return {
        "id": defect.id,
        "inspection_id": defect.inspection_id,
        "status": defect.status,
        "mes_status": defect.mes_status,
        "mes_external_id": getattr(defect, "mes_external_id", None),
        "sent_to_mes_at": defect.sent_to_mes_at.isoformat(timespec="seconds")
        if defect.sent_to_mes_at
        else None,
        "mes_message": defect.mes_message,
        "payload": mes_response.get("payload"),
        "mes_response": mes_response,
        "message": "Дефект передан в mock-MES",
    }