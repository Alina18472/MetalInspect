import os
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.defect import Defect


router = APIRouter(prefix="/journal", tags=["journal"])


BACKEND_DIR = Path(__file__).resolve().parents[2]
MEDIA_DIR = BACKEND_DIR / "media"


def file_path_to_media_url(file_path: str | None) -> str | None:
    if not file_path:
        return None

    try:
        path = Path(file_path)
        rel = path.relative_to(MEDIA_DIR)
        return "/media/" + rel.as_posix()
    except Exception:
        # запасной вариант, если путь почему-то не относительно backend/media
        return "/media/best_frames/" + os.path.basename(file_path)


def defect_to_dict(defect: Defect) -> dict:
    inspection = defect.inspection

    best_frame = None
    if defect.images:
        for img in defect.images:
            if img.image_type == "best_frame":
                best_frame = img
                break

        if best_frame is None:
            best_frame = defect.images[0]

    operator = "Автоматически"
    if defect.confirmed_by:
        operator = f"Пользователь #{defect.confirmed_by}"

    return {
        "id": defect.id,
        "inspection_id": inspection.id if inspection else None,

        "time": defect.created_at.isoformat(timespec="seconds") if defect.created_at else None,
        "ingot_id": inspection.ingot_id if inspection else None,

        "defect_type": defect.defect_type or "crack",
        "confidence": float(defect.confidence or 0),
        "max_p_crack": float(inspection.max_p_crack or 0) if inspection else float(defect.confidence or 0),

        "threshold": float(inspection.threshold or 0) if inspection else None,
        "mode": inspection.mode if inspection else None,
        "frames_count": inspection.frames_count if inspection else None,
        "verdict": inspection.verdict if inspection else None,

        "status": defect.status or "pending",
        "is_confirmed": bool(defect.is_confirmed),

        "operator": operator,
        "comment": defect.engineer_comment or "Требуется проверка оператором",

        "best_frame_path": best_frame.file_path if best_frame else None,
        "best_frame_url": file_path_to_media_url(best_frame.file_path) if best_frame else None,
    }


@router.get("")
def get_journal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defects = (
        db.query(Defect)
        .options(
            joinedload(Defect.inspection),
            joinedload(Defect.images),
        )
        .order_by(Defect.created_at.desc())
        .all()
    )

    return {
        "total": len(defects),
        "items": [defect_to_dict(d) for d in defects],
    }


@router.post("/{defect_id}/confirm")
def confirm_defect(
    defect_id: int,
    comment: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()

    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect.status = "confirmed"
    defect.is_confirmed = True
    defect.confirmed_by = current_user.id
    defect.confirmed_at = datetime.utcnow()

    if comment:
        defect.engineer_comment = comment

    db.commit()
    db.refresh(defect)

    defect = (
        db.query(Defect)
        .options(
            joinedload(Defect.inspection),
            joinedload(Defect.images),
        )
        .filter(Defect.id == defect_id)
        .first()
    )

    return defect_to_dict(defect)


@router.post("/{defect_id}/reject")
def reject_defect(
    defect_id: int,
    comment: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    defect = db.query(Defect).filter(Defect.id == defect_id).first()

    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    defect.status = "rejected"
    defect.is_confirmed = False
    defect.confirmed_by = current_user.id
    defect.confirmed_at = datetime.utcnow()

    if comment:
        defect.engineer_comment = comment

    db.commit()
    db.refresh(defect)

    defect = (
        db.query(Defect)
        .options(
            joinedload(Defect.inspection),
            joinedload(Defect.images),
        )
        .filter(Defect.id == defect_id)
        .first()
    )

    return defect_to_dict(defect)