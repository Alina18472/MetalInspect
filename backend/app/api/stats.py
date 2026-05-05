from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.shift import Shift
from app.models.inspection import Inspection
from app.models.defect import Defect
from app.services.shift_runtime_service import shift_runtime_service


router = APIRouter(prefix="/stats", tags=["stats"])


def date_start(value: Optional[date]):
    if value is None:
        return None
    return datetime.combine(value, time.min)


def date_end_exclusive(value: Optional[date]):
    if value is None:
        return None
    return datetime.combine(value + timedelta(days=1), time.min)


def get_filtered_shifts(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    shift_id: Optional[int] = None,
):
    query = db.query(Shift)

    if shift_id:
        query = query.filter(Shift.id == shift_id)

    start_dt = date_start(date_from)
    end_dt = date_end_exclusive(date_to)

    if start_dt:
        query = query.filter(Shift.started_at >= start_dt)

    if end_dt:
        query = query.filter(Shift.started_at < end_dt)

    return query.order_by(Shift.id.desc()).all()


def shift_to_dict(
    shift: Shift,
    db: Session,
    defect_status: Optional[str] = None,
) -> dict:
    inspections = (
        db.query(Inspection)
        .filter(Inspection.shift_id == shift.id)
        .all()
    )

    processed = len(inspections)
    total_crack = sum(1 for i in inspections if i.has_defect)
    total_ok = processed - total_crack

    sum_max_p = sum(float(i.max_p_crack or 0) for i in inspections)
    sum_frames = sum(int(i.frames_count or 0) for i in inspections)

    defect_rate = (total_crack / processed * 100.0) if processed else 0.0
    avg_max_p = (sum_max_p / processed) if processed else 0.0
    avg_frames = (sum_frames / processed) if processed else 0.0

    defects_query = (
        db.query(Defect)
        .join(Inspection, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id == shift.id)
    )

    all_defects = defects_query.all()

    if defect_status:
        filtered_defects = defects_query.filter(Defect.status == defect_status).all()
    else:
        filtered_defects = all_defects

    pending = sum(1 for d in all_defects if d.status == "pending")
    confirmed = sum(1 for d in all_defects if d.status == "confirmed")
    rejected = sum(1 for d in all_defects if d.status == "rejected")
    sent_to_mes = sum(1 for d in all_defects if d.status == "sent_to_mes")

    return {
        "shift_id": shift.id,
        "status": shift.status,
        "started_at": shift.started_at.isoformat(timespec="seconds") if shift.started_at else None,
        "finished_at": shift.finished_at.isoformat(timespec="seconds") if shift.finished_at else None,

        "mode": shift.mode,
        "threshold": float(shift.threshold or 0),
        "started_by": shift.started_by,

        "processed_ingots": processed,
        "total_crack": total_crack,
        "total_ok": total_ok,
        "defect_rate": defect_rate,
        "avg_max_p_crack": avg_max_p,
        "avg_frames": avg_frames,

        "defects_total": len(filtered_defects),
        "defects_pending": pending,
        "defects_confirmed": confirmed,
        "defects_rejected": rejected,
        "defects_sent_to_mes": sent_to_mes,

        "error_message": shift.error_message,
    }


@router.get("/current-shift")
def get_current_shift_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    runtime_status = shift_runtime_service.get_status()
    shift_id = runtime_status.get("shift_id")

    shift = None

    if shift_id:
        shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        shift = db.query(Shift).order_by(Shift.id.desc()).first()

    if not shift:
        return {
            "has_shift": False,
            "message": "Смены ещё не запускались",
            "runtime": runtime_status,
            "shift": None,
        }

    return {
        "has_shift": True,
        "runtime": runtime_status,
        "shift": shift_to_dict(shift, db),
    }


@router.get("/summary")
def get_stats_summary(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    shift_id: Optional[int] = Query(default=None),
    defect_status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shifts = get_filtered_shifts(
        db=db,
        date_from=date_from,
        date_to=date_to,
        shift_id=shift_id,
    )

    shift_ids = [s.id for s in shifts]

    if not shift_ids:
        return {
            "shifts_count": 0,
            "inspections_count": 0,
            "ok_count": 0,
            "crack_count": 0,
            "defects_count": 0,
            "defect_rate": 0.0,
            "avg_max_p_crack": 0.0,
            "avg_frames": 0.0,
            "defects_pending": 0,
            "defects_confirmed": 0,
            "defects_rejected": 0,
            "defects_sent_to_mes": 0,
            "false_alarm_rate": 0.0,
        }

    inspections_query = db.query(Inspection).filter(Inspection.shift_id.in_(shift_ids))

    inspections_count = inspections_query.count()

    crack_count = (
        inspections_query
        .filter(Inspection.has_defect == True)
        .count()
    )

    ok_count = inspections_count - crack_count

    avg_max_p = inspections_query.with_entities(func.avg(Inspection.max_p_crack)).scalar()
    avg_frames = inspections_query.with_entities(func.avg(Inspection.frames_count)).scalar()

    defects_base_query = (
        db.query(Defect)
        .join(Inspection, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id.in_(shift_ids))
    )

    all_defects_count = defects_base_query.count()

    if defect_status:
        defects_count = defects_base_query.filter(Defect.status == defect_status).count()
    else:
        defects_count = all_defects_count

    pending_count = defects_base_query.filter(Defect.status == "pending").count()
    confirmed_count = defects_base_query.filter(Defect.status == "confirmed").count()
    rejected_count = defects_base_query.filter(Defect.status == "rejected").count()
    sent_to_mes_count = defects_base_query.filter(Defect.status == "sent_to_mes").count()

    defect_rate = (crack_count / inspections_count * 100.0) if inspections_count else 0.0
    false_alarm_rate = (rejected_count / all_defects_count * 100.0) if all_defects_count else 0.0

    return {
        "shifts_count": len(shifts),
        "inspections_count": inspections_count,
        "ok_count": ok_count,
        "crack_count": crack_count,
        "defects_count": defects_count,

        "defect_rate": defect_rate,
        "avg_max_p_crack": float(avg_max_p or 0),
        "avg_frames": float(avg_frames or 0),

        "defects_pending": pending_count,
        "defects_confirmed": confirmed_count,
        "defects_rejected": rejected_count,
        "defects_sent_to_mes": sent_to_mes_count,

        "false_alarm_rate": false_alarm_rate,
    }


@router.get("/shifts")
def get_shifts_stats(
    limit: int = 20,
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    shift_id: Optional[int] = Query(default=None),
    defect_status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shifts = get_filtered_shifts(
        db=db,
        date_from=date_from,
        date_to=date_to,
        shift_id=shift_id,
    )

    shifts = shifts[:limit]

    return {
        "total": len(shifts),
        "items": [shift_to_dict(s, db, defect_status=defect_status) for s in shifts],
    }


@router.get("/shifts/{shift_id}")
def get_shift_details(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()

    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    inspections = (
        db.query(Inspection)
        .filter(Inspection.shift_id == shift.id)
        .order_by(Inspection.id.asc())
        .all()
    )

    return {
        "shift": shift_to_dict(shift, db),
        "inspections": [
            {
                "id": i.id,
                "ingot_id": i.ingot_id,
                "verdict": i.verdict,
                "has_defect": bool(i.has_defect),
                "max_p_crack": float(i.max_p_crack or 0),
                "confidence": float(i.confidence or 0),
                "threshold": float(i.threshold or 0),
                "mode": i.mode,
                "frames_count": i.frames_count,
                "started_at": i.started_at.isoformat(timespec="seconds") if i.started_at else None,
                "finished_at": i.finished_at.isoformat(timespec="seconds") if i.finished_at else None,
            }
            for i in inspections
        ],
    }