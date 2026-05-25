# # stats.py
# from datetime import date, datetime, time, timedelta
# from typing import Optional

# from fastapi import APIRouter, Depends, HTTPException, Query
# from sqlalchemy.orm import Session
# from sqlalchemy import func, case, or_

# from app.core.database import get_db
# from collections import defaultdict
# from app.models.user import User
# from app.models.shift import Shift
# from app.models.inspection import Inspection
# from app.models.defect import Defect
# from app.services.shift_runtime_service import shift_runtime_service
# from app.core.security import require_permission

# router = APIRouter(prefix="/stats", tags=["stats"])


# def date_start(value: Optional[date]):
#     if value is None:
#         return None

#     return datetime.combine(value, time.min)


# def date_end_exclusive(value: Optional[date]):
#     if value is None:
#         return None

#     return datetime.combine(value + timedelta(days=1), time.min)


# def get_filtered_shifts(
#     db: Session,
#     date_from: Optional[date] = None,
#     date_to: Optional[date] = None,
#     shift_id: Optional[int] = None,
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ):
#     query = db.query(Shift)

#     if ai_model_id or ai_model_type or ai_model_key:
#         query = query.join(Inspection, Inspection.shift_id == Shift.id)
#         query = apply_model_filters(
#             query=query,
#             ai_model_id=ai_model_id,
#             ai_model_type=ai_model_type,
#             ai_model_key=ai_model_key,
#         )
#         query = query.distinct()

#     if shift_id:
#         query = query.filter(Shift.id == shift_id)

#     start_dt = date_start(date_from)
#     end_dt = date_end_exclusive(date_to)

#     if start_dt:
#         query = query.filter(Shift.started_at >= start_dt)

#     if end_dt:
#         query = query.filter(Shift.started_at < end_dt)

#     return query.order_by(Shift.id.desc()).all()
# def calculate_engineer_metrics(
#     all_defects_count: int,
#     confirmed_count: int,
#     rejected_count: int,
#     sent_to_mes_count: int,
# ) -> dict:
#     engineer_confirmed_count = confirmed_count + sent_to_mes_count
#     engineer_reviewed_count = confirmed_count + rejected_count + sent_to_mes_count

#     false_alarm_rate = (
#         rejected_count / all_defects_count * 100.0
#         if all_defects_count
#         else 0.0
#     )

#     false_alarm_rate_reviewed = (
#         rejected_count / engineer_reviewed_count * 100.0
#         if engineer_reviewed_count
#         else 0.0
#     )

#     engineer_confirmation_rate = (
#         engineer_confirmed_count / engineer_reviewed_count * 100.0
#         if engineer_reviewed_count
#         else 0.0
#     )

#     return {
#         "engineer_confirmed_count": engineer_confirmed_count,
#         "engineer_reviewed_count": engineer_reviewed_count,
#         "false_alarm_rate": false_alarm_rate,
#         "false_alarm_rate_reviewed": false_alarm_rate_reviewed,
#         "engineer_confirmation_rate": engineer_confirmation_rate,
#     }

# def defect_score_expr():
#     return case(
#         (
#             (Inspection.max_p_crack.isnot(None)) & (Inspection.max_p_crack > 0),
#             Inspection.max_p_crack,
#         ),
#         else_=Inspection.confidence,
#     )


# def float_or_none(value):
#     if value is None:
#         return None

#     return float(value)
# def apply_model_filters(
#     query,
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ):
#     if ai_model_id:
#         query = query.filter(Inspection.ai_model_id == ai_model_id)

#     if ai_model_key:
#         query = query.filter(Inspection.ai_model_key == ai_model_key)

#     if ai_model_type:
#         model_type = str(ai_model_type).strip().lower()

#         if model_type == "classification":
#             query = query.filter(
#                 or_(
#                     Inspection.ai_model_type == "classification",
#                     Inspection.ai_model_architecture.ilike("%resnet%"),
#                     Inspection.ai_model_name.ilike("%resnet%"),
#                     Inspection.ai_model_key.ilike("%resnet%"),
#                 )
#             )

#         elif model_type == "detection":
#             query = query.filter(
#                 or_(
#                     Inspection.ai_model_type == "detection",
#                     Inspection.ai_model_architecture.ilike("%yolo%"),
#                     Inspection.ai_model_name.ilike("%yolo%"),
#                     Inspection.ai_model_key.ilike("%yolo%"),
#                 )
#             )

#     return query
# def inspection_score_value(inspection: Inspection):
#     max_p = getattr(inspection, "max_p_crack", None)

#     if max_p is not None and float(max_p) > 0:
#         return float(max_p)

#     confidence = getattr(inspection, "confidence", None)

#     if confidence is not None:
#         return float(confidence)

#     return None


# def get_model_snapshot(inspection: Inspection) -> dict:
#     model_id = getattr(inspection, "ai_model_id", None)
#     model_key = getattr(inspection, "ai_model_key", None) or "unknown"
#     model_name = getattr(inspection, "ai_model_name", None)
#     model_type = getattr(inspection, "ai_model_type", None)
#     architecture = getattr(inspection, "ai_model_architecture", None)

#     search_text = " ".join(
#         [
#             str(model_key or ""),
#             str(model_name or ""),
#             str(architecture or ""),
#         ]
#     ).lower()

#     if not model_type:
#         if "yolo" in search_text:
#             model_type = "detection"
#         elif "resnet" in search_text:
#             model_type = "classification"
#         else:
#             model_type = "unknown"

#     if not architecture:
#         if "yolo" in search_text:
#             architecture = "YOLOv8"
#         elif "resnet" in search_text:
#             architecture = "ResNet18"
#         else:
#             architecture = "—"

#     if not model_name:
#         if architecture and architecture != "—":
#             model_name = architecture
#         elif model_key != "unknown":
#             model_name = model_key
#         else:
#             model_name = "Модель не указана"

#     return {
#         "model_id": model_id,
#         "model_key": model_key,
#         "model_name": model_name,
#         "model_type": model_type,
#         "model_architecture": architecture,
#     }


# def model_group_key(snapshot: dict):
#     return (
#         snapshot.get("model_id") or 0,
#         snapshot.get("model_key") or "unknown",
#         snapshot.get("model_type") or "unknown",
#         snapshot.get("model_architecture") or "—",
#         snapshot.get("model_name") or "Модель не указана",
#     )


# def create_model_group(snapshot: dict) -> dict:
#     return {
#         **snapshot,

#         "ai_checked_count": 0,
#         "ai_ok_count": 0,
#         "ai_crack_count": 0,
#         "ai_defect_rate": 0.0,

#         "defect_events_total": 0,
#         "defect_events_filtered": 0,

#         "engineer_pending_count": 0,
#         "engineer_confirmed_status_count": 0,
#         "engineer_rejected_count": 0,
#         "engineer_sent_to_mes_count": 0,
#         "engineer_confirmed_count": 0,
#         "engineer_reviewed_count": 0,

#         "false_alarm_rate_all": 0.0,
#         "false_alarm_rate_reviewed": 0.0,
#         "engineer_confirmation_rate": 0.0,

#         "avg_max_p_crack_ai_defects": None,
#         "avg_max_p_crack_confirmed_defects": None,
#         "avg_bbox_count": None,

#         "_ai_defect_score_sum": 0.0,
#         "_ai_defect_score_count": 0,
#         "_confirmed_score_sum": 0.0,
#         "_confirmed_score_count": 0,
#         "_bbox_count_sum": 0.0,
#         "_bbox_count_count": 0,
#     }


# def finalize_model_group(group: dict) -> dict:
#     checked = group["ai_checked_count"]
#     total_events = group["defect_events_total"]

#     confirmed_status = group["engineer_confirmed_status_count"]
#     rejected = group["engineer_rejected_count"]
#     sent_to_mes = group["engineer_sent_to_mes_count"]

#     engineer_metrics = calculate_engineer_metrics(
#         all_defects_count=total_events,
#         confirmed_count=confirmed_status,
#         rejected_count=rejected,
#         sent_to_mes_count=sent_to_mes,
#     )

#     group["engineer_confirmed_count"] = engineer_metrics["engineer_confirmed_count"]
#     group["engineer_reviewed_count"] = engineer_metrics["engineer_reviewed_count"]
#     group["false_alarm_rate_all"] = engineer_metrics["false_alarm_rate"]
#     group["false_alarm_rate_reviewed"] = engineer_metrics["false_alarm_rate_reviewed"]
#     group["engineer_confirmation_rate"] = engineer_metrics["engineer_confirmation_rate"]

#     group["ai_defect_rate"] = (
#         group["ai_crack_count"] / checked * 100.0
#         if checked
#         else 0.0
#     )

#     group["avg_max_p_crack_ai_defects"] = (
#         group["_ai_defect_score_sum"] / group["_ai_defect_score_count"]
#         if group["_ai_defect_score_count"]
#         else None
#     )

#     group["avg_max_p_crack_confirmed_defects"] = (
#         group["_confirmed_score_sum"] / group["_confirmed_score_count"]
#         if group["_confirmed_score_count"]
#         else None
#     )

#     group["avg_bbox_count"] = (
#         group["_bbox_count_sum"] / group["_bbox_count_count"]
#         if group["_bbox_count_count"]
#         else None
#     )

#     clean_group = {
#         key: value
#         for key, value in group.items()
#         if not key.startswith("_")
#     }

#     return clean_group
# def shift_to_dict(
#     shift: Shift,
#     db: Session,
#     defect_status: Optional[str] = None,
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ) -> dict:
#     inspections_query = (
#         db.query(Inspection)
#         .filter(Inspection.shift_id == shift.id)
#     )

#     inspections_query = apply_model_filters(
#         inspections_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     inspections = inspections_query.all()

#     processed = len(inspections)

#     ai_crack_count = sum(1 for i in inspections if i.has_defect)
#     ai_ok_count = processed - ai_crack_count

#     sum_max_p = sum(float(i.max_p_crack or 0) for i in inspections)
#     sum_frames = sum(int(i.frames_count or 0) for i in inspections)

#     ai_defect_rate = (ai_crack_count / processed * 100.0) if processed else 0.0
#     avg_max_p = (sum_max_p / processed) if processed else 0.0
#     avg_frames = (sum_frames / processed) if processed else 0.0
#     avg_ai_defect_query = (
#         db.query(func.avg(defect_score_expr()))
#         .filter(Inspection.shift_id == shift.id)
#         .filter(Inspection.has_defect == True)
#     )

#     avg_ai_defect_query = apply_model_filters(
#         query=avg_ai_defect_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     avg_ai_defect_max_p = avg_ai_defect_query.scalar()

#     avg_confirmed_query = (
#         db.query(func.avg(defect_score_expr()))
#         .join(Defect, Defect.inspection_id == Inspection.id)
#         .filter(Inspection.shift_id == shift.id)
#         .filter(Defect.status.in_(["confirmed", "sent_to_mes"]))
#     )   

#     avg_confirmed_query = apply_model_filters(
#         query=avg_confirmed_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     avg_confirmed_defect_max_p = avg_confirmed_query.scalar()

#     defects_query = (
#         db.query(Defect)
#         .join(Inspection, Defect.inspection_id == Inspection.id)
#         .filter(Inspection.shift_id == shift.id)
#     )
#     defects_query = apply_model_filters(
#         query=defects_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     all_defects = defects_query.all()

#     if defect_status:
#         filtered_defects = defects_query.filter(Defect.status == defect_status).all()
#     else:
#         filtered_defects = all_defects

#     pending = sum(1 for d in all_defects if d.status == "pending")
#     confirmed = sum(1 for d in all_defects if d.status == "confirmed")
#     rejected = sum(1 for d in all_defects if d.status == "rejected")
#     sent_to_mes = sum(1 for d in all_defects if d.status == "sent_to_mes")

#     engineer_metrics = calculate_engineer_metrics(
#         all_defects_count=len(all_defects),
#         confirmed_count=confirmed,
#         rejected_count=rejected,
#         sent_to_mes_count=sent_to_mes,
#     )

#     return {
#         "shift_id": shift.id,
#         "status": shift.status,
#         "started_at": shift.started_at.isoformat(timespec="seconds") if shift.started_at else None,
#         "finished_at": shift.finished_at.isoformat(timespec="seconds") if shift.finished_at else None,

#         "mode": shift.mode,
#         "threshold": float(shift.threshold or 0),
#         "started_by": shift.started_by,
#         "processed_ingots": processed,
#         "total_crack": ai_crack_count,
#         "total_ok": ai_ok_count,
#         "defect_rate": ai_defect_rate,
#         "avg_max_p_crack": avg_max_p,
#         "avg_frames": avg_frames,
#         "avg_max_p_crack_ai_defects": float_or_none(avg_ai_defect_max_p),
#         "avg_max_p_crack_confirmed_defects": float_or_none(avg_confirmed_defect_max_p),

#         "defects_total": len(filtered_defects),
#         "defects_pending": pending,
#         "defects_confirmed": confirmed,
#         "defects_rejected": rejected,
#         "defects_sent_to_mes": sent_to_mes,

#         "false_alarm_rate": engineer_metrics["false_alarm_rate"],

#         "ai_checked_count": processed,
#         "ai_ok_count": ai_ok_count,
#         "ai_crack_count": ai_crack_count,
#         "ai_defect_rate": ai_defect_rate,

#         "defect_events_total": len(all_defects),
#         "defect_events_filtered": len(filtered_defects),

#         "engineer_pending_count": pending,
#         "engineer_confirmed_status_count": confirmed,
#         "engineer_rejected_count": rejected,
#         "engineer_sent_to_mes_count": sent_to_mes,

#         "engineer_confirmed_count": engineer_metrics["engineer_confirmed_count"],

#         "engineer_reviewed_count": engineer_metrics["engineer_reviewed_count"],

#         "false_alarm_rate_all": engineer_metrics["false_alarm_rate"],

#         "false_alarm_rate_reviewed": engineer_metrics["false_alarm_rate_reviewed"],

#         "engineer_confirmation_rate": engineer_metrics["engineer_confirmation_rate"],

#         "error_message": shift.error_message,
#     }


# @router.get("/current-shift")
# def get_current_shift_stats(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("stats.view")),
# ):
#     runtime_status = shift_runtime_service.get_status()
#     shift_id = runtime_status.get("shift_id")

#     shift = None

#     if shift_id:
#         shift = db.query(Shift).filter(Shift.id == shift_id).first()

#     if not shift:
#         shift = db.query(Shift).order_by(Shift.id.desc()).first()

#     if not shift:
#         return {
#             "has_shift": False,
#             "message": "Смены ещё не запускались",
#             "runtime": runtime_status,
#             "shift": None,
#         }

#     return {
#         "has_shift": True,
#         "runtime": runtime_status,
#         "shift": shift_to_dict(shift, db),
#     }


# @router.get("/summary")
# def get_stats_summary(
#     date_from: Optional[date] = Query(default=None),
#     date_to: Optional[date] = Query(default=None),
#     shift_id: Optional[int] = Query(default=None),
#     defect_status: Optional[str] = Query(default=None),
#     ai_model_id: Optional[int] = Query(default=None),
#     ai_model_type: Optional[str] = Query(default=None),
#     ai_model_key: Optional[str] = Query(default=None),
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("stats.full_view")),
# ):
#     shifts = get_filtered_shifts(
#         db=db,
#         date_from=date_from,
#         date_to=date_to,
#         shift_id=shift_id,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     shift_ids = [s.id for s in shifts]

#     if not shift_ids:
#         return {
#             "shifts_count": 0,
#             "inspections_count": 0,
#             "ok_count": 0,
#             "crack_count": 0,
#             "defects_count": 0,
#             "defect_rate": 0.0,
          
#             "defects_pending": 0,
#             "defects_confirmed": 0,
#             "defects_rejected": 0,
#             "defects_sent_to_mes": 0,
#             "false_alarm_rate": 0.0,
#             "avg_max_p_crack_ai_defects": 0.0,
#             "avg_max_p_crack_confirmed_defects": 0.0,

#             "ai_checked_count": 0,
#             "ai_ok_count": 0,
#             "ai_crack_count": 0,
#             "ai_defect_rate": 0.0,

#             "defect_events_total": 0,
#             "defect_events_filtered": 0,

#             "engineer_pending_count": 0,
#             "engineer_confirmed_status_count": 0,
#             "engineer_rejected_count": 0,
#             "engineer_sent_to_mes_count": 0,
#             "engineer_confirmed_count": 0,
#             "engineer_reviewed_count": 0,
#             "false_alarm_rate_all": 0.0,
#             "false_alarm_rate_reviewed": 0.0,
#             "engineer_confirmation_rate": 0.0,
#         }

#     inspections_query = db.query(Inspection).filter(Inspection.shift_id.in_(shift_ids))
#     inspections_query = apply_model_filters(
#         query=inspections_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )
#     inspections_count = inspections_query.count()

#     ai_crack_count = (
#         inspections_query
#         .filter(Inspection.has_defect == True)
#         .count()
#     )

#     ai_ok_count = inspections_count - ai_crack_count

   
#     avg_ai_defect_query = (
#         db.query(func.avg(defect_score_expr()))
#         .filter(Inspection.shift_id.in_(shift_ids))
#         .filter(Inspection.has_defect == True)
#     )

#     avg_ai_defect_query = apply_model_filters(
#         query=avg_ai_defect_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     avg_ai_defect_max_p = avg_ai_defect_query.scalar()

#     defects_base_query = (
#         db.query(Defect)
#         .join(Inspection, Defect.inspection_id == Inspection.id)
#         .filter(Inspection.shift_id.in_(shift_ids))
#     )
#     defects_base_query = apply_model_filters(
#         query=defects_base_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     all_defects_count = defects_base_query.count()

#     if defect_status:
#         filtered_defects_count = (
#             defects_base_query
#             .filter(Defect.status == defect_status)
#             .count()
#         )
#     else:
#         filtered_defects_count = all_defects_count

#     pending_count = defects_base_query.filter(Defect.status == "pending").count()
#     confirmed_count = defects_base_query.filter(Defect.status == "confirmed").count()
#     rejected_count = defects_base_query.filter(Defect.status == "rejected").count()
#     sent_to_mes_count = defects_base_query.filter(Defect.status == "sent_to_mes").count()
#     avg_confirmed_query = (
#         db.query(func.avg(defect_score_expr()))
#         .join(Defect, Defect.inspection_id == Inspection.id)
#         .filter(Inspection.shift_id.in_(shift_ids))
#         .filter(Defect.status.in_(["confirmed", "sent_to_mes"]))
#     )

#     avg_confirmed_query = apply_model_filters(
#         query=avg_confirmed_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     avg_confirmed_defect_max_p = avg_confirmed_query.scalar()
#     ai_defect_rate = (
#         ai_crack_count / inspections_count * 100.0
#         if inspections_count
#         else 0.0
#     )

#     engineer_metrics = calculate_engineer_metrics(
#         all_defects_count=all_defects_count,
#         confirmed_count=confirmed_count,
#         rejected_count=rejected_count,
#         sent_to_mes_count=sent_to_mes_count,
#     )

#     return {
#         "shifts_count": len(shifts),
#         "inspections_count": inspections_count,
#         "ok_count": ai_ok_count,
#         "crack_count": ai_crack_count,
#         "defects_count": filtered_defects_count,

#         "defect_rate": ai_defect_rate,
#         "avg_max_p_crack_ai_defects": float(avg_ai_defect_max_p or 0),
#         "avg_max_p_crack_confirmed_defects": float(avg_confirmed_defect_max_p or 0),

#         "defects_pending": pending_count,
#         "defects_confirmed": confirmed_count,
#         "defects_rejected": rejected_count,
#         "defects_sent_to_mes": sent_to_mes_count,

#         "false_alarm_rate": engineer_metrics["false_alarm_rate"],

#         "ai_checked_count": inspections_count,
#         "ai_ok_count": ai_ok_count,
#         "ai_crack_count": ai_crack_count,
#         "ai_defect_rate": ai_defect_rate,

#         "defect_events_total": all_defects_count,
#         "defect_events_filtered": filtered_defects_count,

#         "engineer_pending_count": pending_count,
#         "engineer_confirmed_status_count": confirmed_count,
#         "engineer_rejected_count": rejected_count,
#         "engineer_sent_to_mes_count": sent_to_mes_count,

#         "engineer_confirmed_count": engineer_metrics["engineer_confirmed_count"],
#         "engineer_reviewed_count": engineer_metrics["engineer_reviewed_count"],
#         "false_alarm_rate_all": engineer_metrics["false_alarm_rate"],
#         "false_alarm_rate_reviewed": engineer_metrics["false_alarm_rate_reviewed"],
#         "engineer_confirmation_rate": engineer_metrics["engineer_confirmation_rate"],
#     }


# @router.get("/shifts")
# def get_shifts_stats(
#     page: int = Query(default=1, ge=1),
#     page_size: int = Query(default=10, ge=1, le=100),
#     date_from: Optional[date] = Query(default=None),
#     date_to: Optional[date] = Query(default=None),
#     shift_id: Optional[int] = Query(default=None),
#     defect_status: Optional[str] = Query(default=None),
#     ai_model_id: Optional[int] = Query(default=None),
#     ai_model_type: Optional[str] = Query(default=None),
#     ai_model_key: Optional[str] = Query(default=None),
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("stats.full_view")),
# ):
#     all_shifts = get_filtered_shifts(
#         db=db,
#         date_from=date_from,
#         date_to=date_to,
#         shift_id=shift_id,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     total = len(all_shifts)
#     total_pages = max((total + page_size - 1) // page_size, 1)

#     if page > total_pages:
#         page = total_pages

#     start = (page - 1) * page_size
#     end = start + page_size

#     paginated_shifts = all_shifts[start:end]

#     return {
#         "total": total,
#         "page": page,
#         "page_size": page_size,
#         "total_pages": total_pages,
#         "has_next": page < total_pages,
#         "has_prev": page > 1,
#         "items": [
#             shift_to_dict(
#                 s,
#                 db,
#                 defect_status=defect_status,
#                 ai_model_id=ai_model_id,
#                 ai_model_type=ai_model_type,
#                 ai_model_key=ai_model_key,
#             )
#             for s in paginated_shifts
#         ],
#     }


# @router.get("/shifts/{shift_id}")
# def get_shift_details(
#     shift_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("stats.full_view")),
# ):
#     shift = db.query(Shift).filter(Shift.id == shift_id).first()

#     if not shift:
#         raise HTTPException(status_code=404, detail="Shift not found")

#     inspections = (
#         db.query(Inspection)
#         .filter(Inspection.shift_id == shift.id)
#         .order_by(Inspection.id.asc())
#         .all()
#     )

#     return {
#         "shift": shift_to_dict(shift, db),
#         "inspections": [
#             {
#                 "id": i.id,
#                 "ingot_id": i.ingot_id,
#                 "verdict": i.verdict,
#                 "has_defect": bool(i.has_defect),
#                 "max_p_crack": float(i.max_p_crack or 0),
#                 "confidence": float(i.confidence or 0),
#                 "threshold": float(i.threshold or 0),
#                 "mode": i.mode,
#                 "frames_count": i.frames_count,
#                 "started_at": i.started_at.isoformat(timespec="seconds") if i.started_at else None,
#                 "finished_at": i.finished_at.isoformat(timespec="seconds") if i.finished_at else None,
#             }
#             for i in inspections
#         ],
#     }
    
    
# @router.get("/models")
# def get_models_stats(
#     date_from: Optional[date] = Query(default=None),
#     date_to: Optional[date] = Query(default=None),
#     shift_id: Optional[int] = Query(default=None),
#     defect_status: Optional[str] = Query(default=None),
#     ai_model_id: Optional[int] = Query(default=None),
#     ai_model_type: Optional[str] = Query(default=None),
#     ai_model_key: Optional[str] = Query(default=None),
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_permission("stats.full_view")),
# ):
#     shifts = get_filtered_shifts(
#         db=db,
#         date_from=date_from,
#         date_to=date_to,
#         shift_id=shift_id,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     shift_ids = [s.id for s in shifts]

#     if not shift_ids:
#         return []

#     groups = {}

#     def ensure_group(inspection: Inspection) -> dict:
#         snapshot = get_model_snapshot(inspection)
#         key = model_group_key(snapshot)

#         if key not in groups:
#             groups[key] = create_model_group(snapshot)

#         return groups[key]

#     inspections = (
#         db.query(Inspection)
#         .filter(Inspection.shift_id.in_(shift_ids))
#         .all()
#     )
#     inspections_query = (
#         db.query(Inspection)
#         .filter(Inspection.shift_id.in_(shift_ids))
#     )

#     inspections_query = apply_model_filters(
#         query=inspections_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     inspections = inspections_query.all()

#     for inspection in inspections:
#         group = ensure_group(inspection)

#         group["ai_checked_count"] += 1

#         if inspection.has_defect:
#             group["ai_crack_count"] += 1

#             score = inspection_score_value(inspection)

#             if score is not None:
#                 group["_ai_defect_score_sum"] += score
#                 group["_ai_defect_score_count"] += 1
#         else:
#             group["ai_ok_count"] += 1

#     defect_rows_query = (
#         db.query(Defect, Inspection)
#         .join(Inspection, Defect.inspection_id == Inspection.id)
#         .filter(Inspection.shift_id.in_(shift_ids))
#     )

#     defect_rows_query = apply_model_filters(
#         query=defect_rows_query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     defect_rows = defect_rows_query.all()

#     for defect, inspection in defect_rows:
#         group = ensure_group(inspection)

#         status = defect.status

#         group["defect_events_total"] += 1

#         if not defect_status or status == defect_status:
#             group["defect_events_filtered"] += 1

#         if status == "pending":
#             group["engineer_pending_count"] += 1
#         elif status == "confirmed":
#             group["engineer_confirmed_status_count"] += 1
#         elif status == "rejected":
#             group["engineer_rejected_count"] += 1
#         elif status == "sent_to_mes":
#             group["engineer_sent_to_mes_count"] += 1

#         if status in ["confirmed", "sent_to_mes"]:
#             score = inspection_score_value(inspection)

#             if score is not None:
#                 group["_confirmed_score_sum"] += score
#                 group["_confirmed_score_count"] += 1

#         bbox_count = getattr(defect, "bbox_count", None)

#         if bbox_count is not None:
#             group["_bbox_count_sum"] += float(bbox_count or 0)
#             group["_bbox_count_count"] += 1

#     result = [finalize_model_group(group) for group in groups.values()]

#     return sorted(
#         result,
#         key=lambda item: item["ai_checked_count"],
#         reverse=True,
#     )
    
# def has_model_filter(
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ) -> bool:
#     return bool(ai_model_id or ai_model_type or ai_model_key)


# def apply_model_filters(
#     query,
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ):
#     if ai_model_id:
#         query = query.filter(Inspection.ai_model_id == ai_model_id)

#     if ai_model_type:
#         query = query.filter(Inspection.ai_model_type == ai_model_type)

#     if ai_model_key:
#         query = query.filter(Inspection.ai_model_key == ai_model_key)

#     return query


# def get_shift_ids_for_model_filter(
#     db: Session,
#     shift_ids: list[int],
#     ai_model_id: Optional[int] = None,
#     ai_model_type: Optional[str] = None,
#     ai_model_key: Optional[str] = None,
# ) -> set[int]:
#     if not shift_ids:
#         return set()

#     query = (
#         db.query(Inspection.shift_id)
#         .filter(Inspection.shift_id.in_(shift_ids))
#     )

#     query = apply_model_filters(
#         query,
#         ai_model_id=ai_model_id,
#         ai_model_type=ai_model_type,
#         ai_model_key=ai_model_key,
#     )

#     return {row[0] for row in query.distinct().all()}

from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_permission
from app.models.defect import Defect
from app.models.inspection import Inspection
from app.models.shift import Shift
from app.models.user import User
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


def float_or_none(value):
    if value is None:
        return None

    return float(value)


def has_model_filter(
    ai_model_id: Optional[int] = None,
    ai_model_type: Optional[str] = None,
    ai_model_key: Optional[str] = None,
) -> bool:
    return bool(ai_model_id or ai_model_type or ai_model_key)


def apply_model_filters(
    query,
    ai_model_id: Optional[int] = None,
    ai_model_type: Optional[str] = None,
    ai_model_key: Optional[str] = None,
):
    if ai_model_id:
        query = query.filter(Inspection.ai_model_id == ai_model_id)

    if ai_model_key:
        query = query.filter(Inspection.ai_model_key == ai_model_key)

    if ai_model_type:
        model_type = str(ai_model_type).strip().lower()

        if model_type == "classification":
            query = query.filter(
                or_(
                    Inspection.ai_model_type == "classification",
                    Inspection.ai_model_architecture.ilike("%resnet%"),
                    Inspection.ai_model_name.ilike("%resnet%"),
                    Inspection.ai_model_key.ilike("%resnet%"),
                )
            )

        elif model_type == "detection":
            query = query.filter(
                or_(
                    Inspection.ai_model_type == "detection",
                    Inspection.ai_model_architecture.ilike("%yolo%"),
                    Inspection.ai_model_name.ilike("%yolo%"),
                    Inspection.ai_model_key.ilike("%yolo%"),
                )
            )

    return query


def defect_score_expr():
    return case(
        (
            (Inspection.max_p_crack.isnot(None)) & (Inspection.max_p_crack > 0),
            Inspection.max_p_crack,
        ),
        else_=Inspection.confidence,
    )


def inspection_score_value(inspection: Inspection):
    max_p = getattr(inspection, "max_p_crack", None)

    if max_p is not None and float(max_p) > 0:
        return float(max_p)

    confidence = getattr(inspection, "confidence", None)

    if confidence is not None:
        return float(confidence)

    return None


def calculate_engineer_metrics(
    all_defects_count: int,
    confirmed_count: int,
    rejected_count: int,
    sent_to_mes_count: int,
) -> dict:
    engineer_confirmed_count = confirmed_count + sent_to_mes_count
    engineer_reviewed_count = confirmed_count + rejected_count + sent_to_mes_count

    false_alarm_rate = (
        rejected_count / all_defects_count * 100.0
        if all_defects_count
        else 0.0
    )

    false_alarm_rate_reviewed = (
        rejected_count / engineer_reviewed_count * 100.0
        if engineer_reviewed_count
        else 0.0
    )

    engineer_confirmation_rate = (
        engineer_confirmed_count / engineer_reviewed_count * 100.0
        if engineer_reviewed_count
        else 0.0
    )

    return {
        "engineer_confirmed_count": engineer_confirmed_count,
        "engineer_reviewed_count": engineer_reviewed_count,
        "false_alarm_rate": false_alarm_rate,
        "false_alarm_rate_reviewed": false_alarm_rate_reviewed,
        "engineer_confirmation_rate": engineer_confirmation_rate,
    }


def get_filtered_shifts(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    shift_id: Optional[int] = None,
    ai_model_id: Optional[int] = None,
    ai_model_type: Optional[str] = None,
    ai_model_key: Optional[str] = None,
):
    query = db.query(Shift)

    if has_model_filter(ai_model_id, ai_model_type, ai_model_key):
        query = query.join(Inspection, Inspection.shift_id == Shift.id)

        query = apply_model_filters(
            query=query,
            ai_model_id=ai_model_id,
            ai_model_type=ai_model_type,
            ai_model_key=ai_model_key,
        )

        query = query.distinct()

    if shift_id:
        query = query.filter(Shift.id == shift_id)

    start_dt = date_start(date_from)
    end_dt = date_end_exclusive(date_to)

    if start_dt:
        query = query.filter(Shift.started_at >= start_dt)

    if end_dt:
        query = query.filter(Shift.started_at < end_dt)

    return query.order_by(Shift.id.desc()).all()


def get_model_snapshot(inspection: Inspection) -> dict:
    model_id = getattr(inspection, "ai_model_id", None)
    model_key = getattr(inspection, "ai_model_key", None) or "unknown"
    model_name = getattr(inspection, "ai_model_name", None)
    model_type = getattr(inspection, "ai_model_type", None)
    architecture = getattr(inspection, "ai_model_architecture", None)

    search_text = " ".join(
        [
            str(model_key or ""),
            str(model_name or ""),
            str(architecture or ""),
        ]
    ).lower()

    if not model_type:
        if "yolo" in search_text:
            model_type = "detection"
        elif "resnet" in search_text:
            model_type = "classification"
        else:
            model_type = "unknown"

    if not architecture:
        if "yolo" in search_text:
            architecture = "YOLOv8"
        elif "resnet" in search_text:
            architecture = "ResNet18"
        else:
            architecture = "—"

    if not model_name:
        if architecture and architecture != "—":
            model_name = architecture
        elif model_key != "unknown":
            model_name = model_key
        else:
            model_name = "Модель не указана"

    return {
        "model_id": model_id,
        "model_key": model_key,
        "model_name": model_name,
        "model_type": model_type,
        "model_architecture": architecture,
    }


def model_group_key(snapshot: dict):
    return (
        snapshot.get("model_id") or 0,
        snapshot.get("model_key") or "unknown",
        snapshot.get("model_type") or "unknown",
        snapshot.get("model_architecture") or "—",
        snapshot.get("model_name") or "Модель не указана",
    )


def create_model_group(snapshot: dict) -> dict:
    return {
        **snapshot,
        "ai_checked_count": 0,
        "ai_ok_count": 0,
        "ai_crack_count": 0,
        "ai_defect_rate": 0.0,
        "defect_events_total": 0,
        "defect_events_filtered": 0,
        "engineer_pending_count": 0,
        "engineer_confirmed_status_count": 0,
        "engineer_rejected_count": 0,
        "engineer_sent_to_mes_count": 0,
        "engineer_confirmed_count": 0,
        "engineer_reviewed_count": 0,
        "false_alarm_rate_all": 0.0,
        "false_alarm_rate_reviewed": 0.0,
        "engineer_confirmation_rate": 0.0,
        "avg_max_p_crack_ai_defects": None,
        "avg_max_p_crack_confirmed_defects": None,
        "_ai_defect_score_sum": 0.0,
        "_ai_defect_score_count": 0,
        "_confirmed_score_sum": 0.0,
        "_confirmed_score_count": 0,
    }


def finalize_model_group(group: dict) -> dict:
    checked = group["ai_checked_count"]
    total_events = group["defect_events_total"]

    confirmed_status = group["engineer_confirmed_status_count"]
    rejected = group["engineer_rejected_count"]
    sent_to_mes = group["engineer_sent_to_mes_count"]

    engineer_metrics = calculate_engineer_metrics(
        all_defects_count=total_events,
        confirmed_count=confirmed_status,
        rejected_count=rejected,
        sent_to_mes_count=sent_to_mes,
    )

    group["engineer_confirmed_count"] = engineer_metrics["engineer_confirmed_count"]
    group["engineer_reviewed_count"] = engineer_metrics["engineer_reviewed_count"]
    group["false_alarm_rate_all"] = engineer_metrics["false_alarm_rate"]
    group["false_alarm_rate_reviewed"] = engineer_metrics["false_alarm_rate_reviewed"]
    group["engineer_confirmation_rate"] = engineer_metrics["engineer_confirmation_rate"]

    group["ai_defect_rate"] = (
        group["ai_crack_count"] / checked * 100.0
        if checked
        else 0.0
    )

    group["avg_max_p_crack_ai_defects"] = (
        group["_ai_defect_score_sum"] / group["_ai_defect_score_count"]
        if group["_ai_defect_score_count"]
        else None
    )

    group["avg_max_p_crack_confirmed_defects"] = (
        group["_confirmed_score_sum"] / group["_confirmed_score_count"]
        if group["_confirmed_score_count"]
        else None
    )

    return {
        key: value
        for key, value in group.items()
        if not key.startswith("_")
    }


def shift_to_dict(
    shift: Shift,
    db: Session,
    defect_status: Optional[str] = None,
    ai_model_id: Optional[int] = None,
    ai_model_type: Optional[str] = None,
    ai_model_key: Optional[str] = None,
) -> dict:
    inspections_query = (
        db.query(Inspection)
        .filter(Inspection.shift_id == shift.id)
    )

    inspections_query = apply_model_filters(
        query=inspections_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    inspections = inspections_query.all()

    processed = len(inspections)
    ai_crack_count = sum(1 for item in inspections if item.has_defect)
    ai_ok_count = processed - ai_crack_count

    sum_max_p = sum(float(item.max_p_crack or 0) for item in inspections)
    sum_frames = sum(int(item.frames_count or 0) for item in inspections)

    ai_defect_rate = (
        ai_crack_count / processed * 100.0
        if processed
        else 0.0
    )

    avg_max_p = (
        sum_max_p / processed
        if processed
        else 0.0
    )

    avg_frames = (
        sum_frames / processed
        if processed
        else 0.0
    )

    avg_ai_defect_query = (
        db.query(func.avg(defect_score_expr()))
        .filter(Inspection.shift_id == shift.id)
        .filter(Inspection.has_defect == True)
    )

    avg_ai_defect_query = apply_model_filters(
        query=avg_ai_defect_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    avg_ai_defect_max_p = avg_ai_defect_query.scalar()

    avg_confirmed_query = (
        db.query(func.avg(defect_score_expr()))
        .join(Defect, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id == shift.id)
        .filter(Defect.status.in_(["confirmed", "sent_to_mes"]))
    )

    avg_confirmed_query = apply_model_filters(
        query=avg_confirmed_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    avg_confirmed_defect_max_p = avg_confirmed_query.scalar()

    defects_query = (
        db.query(Defect)
        .join(Inspection, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id == shift.id)
    )

    defects_query = apply_model_filters(
        query=defects_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    all_defects = defects_query.all()

    if defect_status:
        filtered_defects = (
            defects_query
            .filter(Defect.status == defect_status)
            .all()
        )
    else:
        filtered_defects = all_defects

    pending = sum(1 for defect in all_defects if defect.status == "pending")
    confirmed = sum(1 for defect in all_defects if defect.status == "confirmed")
    rejected = sum(1 for defect in all_defects if defect.status == "rejected")
    sent_to_mes = sum(1 for defect in all_defects if defect.status == "sent_to_mes")

    engineer_metrics = calculate_engineer_metrics(
        all_defects_count=len(all_defects),
        confirmed_count=confirmed,
        rejected_count=rejected,
        sent_to_mes_count=sent_to_mes,
    )

    return {
        "shift_id": shift.id,
        "status": shift.status,
        "started_at": shift.started_at.isoformat(timespec="seconds") if shift.started_at else None,
        "finished_at": shift.finished_at.isoformat(timespec="seconds") if shift.finished_at else None,

        "mode": shift.mode,
        "threshold": float(shift.threshold or 0),
        "started_by": shift.started_by,

        "processed_ingots": processed,
        "total_crack": ai_crack_count,
        "total_ok": ai_ok_count,
        "defect_rate": ai_defect_rate,
        "avg_max_p_crack": avg_max_p,
        "avg_frames": avg_frames,

        "avg_max_p_crack_ai_defects": float_or_none(avg_ai_defect_max_p),
        "avg_max_p_crack_confirmed_defects": float_or_none(avg_confirmed_defect_max_p),

        "defects_total": len(filtered_defects),
        "defects_pending": pending,
        "defects_confirmed": confirmed,
        "defects_rejected": rejected,
        "defects_sent_to_mes": sent_to_mes,

        "false_alarm_rate": engineer_metrics["false_alarm_rate"],

        "ai_checked_count": processed,
        "ai_ok_count": ai_ok_count,
        "ai_crack_count": ai_crack_count,
        "ai_defect_rate": ai_defect_rate,

        "defect_events_total": len(all_defects),
        "defect_events_filtered": len(filtered_defects),

        "engineer_pending_count": pending,
        "engineer_confirmed_status_count": confirmed,
        "engineer_rejected_count": rejected,
        "engineer_sent_to_mes_count": sent_to_mes,

        "engineer_confirmed_count": engineer_metrics["engineer_confirmed_count"],
        "engineer_reviewed_count": engineer_metrics["engineer_reviewed_count"],

        "false_alarm_rate_all": engineer_metrics["false_alarm_rate"],
        "false_alarm_rate_reviewed": engineer_metrics["false_alarm_rate_reviewed"],
        "engineer_confirmation_rate": engineer_metrics["engineer_confirmation_rate"],

        "error_message": shift.error_message,
    }


@router.get("/current-shift")
def get_current_shift_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("stats.view")),
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
    ai_model_id: Optional[int] = Query(default=None),
    ai_model_type: Optional[str] = Query(default=None),
    ai_model_key: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("stats.full_view")),
):
    shifts = get_filtered_shifts(
        db=db,
        date_from=date_from,
        date_to=date_to,
        shift_id=shift_id,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    shift_ids = [shift.id for shift in shifts]

    if not shift_ids:
        return {
            "shifts_count": 0,
            "inspections_count": 0,
            "ok_count": 0,
            "crack_count": 0,
            "defects_count": 0,
            "defect_rate": 0.0,

            "defects_pending": 0,
            "defects_confirmed": 0,
            "defects_rejected": 0,
            "defects_sent_to_mes": 0,
            "false_alarm_rate": 0.0,

            "avg_max_p_crack_ai_defects": 0.0,
            "avg_max_p_crack_confirmed_defects": 0.0,

            "ai_checked_count": 0,
            "ai_ok_count": 0,
            "ai_crack_count": 0,
            "ai_defect_rate": 0.0,

            "defect_events_total": 0,
            "defect_events_filtered": 0,

            "engineer_pending_count": 0,
            "engineer_confirmed_status_count": 0,
            "engineer_rejected_count": 0,
            "engineer_sent_to_mes_count": 0,
            "engineer_confirmed_count": 0,
            "engineer_reviewed_count": 0,
            "false_alarm_rate_all": 0.0,
            "false_alarm_rate_reviewed": 0.0,
            "engineer_confirmation_rate": 0.0,
        }

    inspections_query = (
        db.query(Inspection)
        .filter(Inspection.shift_id.in_(shift_ids))
    )

    inspections_query = apply_model_filters(
        query=inspections_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    inspections_count = inspections_query.count()

    ai_crack_count = (
        inspections_query
        .filter(Inspection.has_defect == True)
        .count()
    )

    ai_ok_count = inspections_count - ai_crack_count

    avg_ai_defect_query = (
        db.query(func.avg(defect_score_expr()))
        .filter(Inspection.shift_id.in_(shift_ids))
        .filter(Inspection.has_defect == True)
    )

    avg_ai_defect_query = apply_model_filters(
        query=avg_ai_defect_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    avg_ai_defect_max_p = avg_ai_defect_query.scalar()

    defects_base_query = (
        db.query(Defect)
        .join(Inspection, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id.in_(shift_ids))
    )

    defects_base_query = apply_model_filters(
        query=defects_base_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    all_defects_count = defects_base_query.count()

    if defect_status:
        filtered_defects_count = (
            defects_base_query
            .filter(Defect.status == defect_status)
            .count()
        )
    else:
        filtered_defects_count = all_defects_count

    pending_count = (
        defects_base_query
        .filter(Defect.status == "pending")
        .count()
    )

    confirmed_count = (
        defects_base_query
        .filter(Defect.status == "confirmed")
        .count()
    )

    rejected_count = (
        defects_base_query
        .filter(Defect.status == "rejected")
        .count()
    )

    sent_to_mes_count = (
        defects_base_query
        .filter(Defect.status == "sent_to_mes")
        .count()
    )

    avg_confirmed_query = (
        db.query(func.avg(defect_score_expr()))
        .join(Defect, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id.in_(shift_ids))
        .filter(Defect.status.in_(["confirmed", "sent_to_mes"]))
    )

    avg_confirmed_query = apply_model_filters(
        query=avg_confirmed_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    avg_confirmed_defect_max_p = avg_confirmed_query.scalar()

    ai_defect_rate = (
        ai_crack_count / inspections_count * 100.0
        if inspections_count
        else 0.0
    )

    engineer_metrics = calculate_engineer_metrics(
        all_defects_count=all_defects_count,
        confirmed_count=confirmed_count,
        rejected_count=rejected_count,
        sent_to_mes_count=sent_to_mes_count,
    )

    return {
        "shifts_count": len(shifts),
        "inspections_count": inspections_count,
        "ok_count": ai_ok_count,
        "crack_count": ai_crack_count,
        "defects_count": filtered_defects_count,

        "defect_rate": ai_defect_rate,
        "avg_max_p_crack_ai_defects": float(avg_ai_defect_max_p or 0),
        "avg_max_p_crack_confirmed_defects": float(avg_confirmed_defect_max_p or 0),

        "defects_pending": pending_count,
        "defects_confirmed": confirmed_count,
        "defects_rejected": rejected_count,
        "defects_sent_to_mes": sent_to_mes_count,

        "false_alarm_rate": engineer_metrics["false_alarm_rate"],

        "ai_checked_count": inspections_count,
        "ai_ok_count": ai_ok_count,
        "ai_crack_count": ai_crack_count,
        "ai_defect_rate": ai_defect_rate,

        "defect_events_total": all_defects_count,
        "defect_events_filtered": filtered_defects_count,

        "engineer_pending_count": pending_count,
        "engineer_confirmed_status_count": confirmed_count,
        "engineer_rejected_count": rejected_count,
        "engineer_sent_to_mes_count": sent_to_mes_count,

        "engineer_confirmed_count": engineer_metrics["engineer_confirmed_count"],
        "engineer_reviewed_count": engineer_metrics["engineer_reviewed_count"],
        "false_alarm_rate_all": engineer_metrics["false_alarm_rate"],
        "false_alarm_rate_reviewed": engineer_metrics["false_alarm_rate_reviewed"],
        "engineer_confirmation_rate": engineer_metrics["engineer_confirmation_rate"],
    }


@router.get("/shifts")
def get_shifts_stats(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    shift_id: Optional[int] = Query(default=None),
    defect_status: Optional[str] = Query(default=None),
    ai_model_id: Optional[int] = Query(default=None),
    ai_model_type: Optional[str] = Query(default=None),
    ai_model_key: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("stats.full_view")),
):
    all_shifts = get_filtered_shifts(
        db=db,
        date_from=date_from,
        date_to=date_to,
        shift_id=shift_id,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    total = len(all_shifts)
    total_pages = max((total + page_size - 1) // page_size, 1)

    if page > total_pages:
        page = total_pages

    start = (page - 1) * page_size
    end = start + page_size

    paginated_shifts = all_shifts[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "items": [
            shift_to_dict(
                shift=s,
                db=db,
                defect_status=defect_status,
                ai_model_id=ai_model_id,
                ai_model_type=ai_model_type,
                ai_model_key=ai_model_key,
            )
            for s in paginated_shifts
        ],
    }


@router.get("/models")
def get_models_stats(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    shift_id: Optional[int] = Query(default=None),
    defect_status: Optional[str] = Query(default=None),
    ai_model_id: Optional[int] = Query(default=None),
    ai_model_type: Optional[str] = Query(default=None),
    ai_model_key: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("stats.full_view")),
):
    shifts = get_filtered_shifts(
        db=db,
        date_from=date_from,
        date_to=date_to,
        shift_id=shift_id,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    shift_ids = [shift.id for shift in shifts]

    if not shift_ids:
        return []

    groups = {}

    def ensure_group(inspection: Inspection) -> dict:
        snapshot = get_model_snapshot(inspection)
        key = model_group_key(snapshot)

        if key not in groups:
            groups[key] = create_model_group(snapshot)

        return groups[key]

    inspections_query = (
        db.query(Inspection)
        .filter(Inspection.shift_id.in_(shift_ids))
    )

    inspections_query = apply_model_filters(
        query=inspections_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    inspections = inspections_query.all()

    for inspection in inspections:
        group = ensure_group(inspection)

        group["ai_checked_count"] += 1

        if inspection.has_defect:
            group["ai_crack_count"] += 1

            score = inspection_score_value(inspection)

            if score is not None:
                group["_ai_defect_score_sum"] += score
                group["_ai_defect_score_count"] += 1
        else:
            group["ai_ok_count"] += 1

    defect_rows_query = (
        db.query(Defect, Inspection)
        .join(Inspection, Defect.inspection_id == Inspection.id)
        .filter(Inspection.shift_id.in_(shift_ids))
    )

    defect_rows_query = apply_model_filters(
        query=defect_rows_query,
        ai_model_id=ai_model_id,
        ai_model_type=ai_model_type,
        ai_model_key=ai_model_key,
    )

    defect_rows = defect_rows_query.all()

    for defect, inspection in defect_rows:
        group = ensure_group(inspection)
        status = defect.status

        group["defect_events_total"] += 1

        if not defect_status or status == defect_status:
            group["defect_events_filtered"] += 1

        if status == "pending":
            group["engineer_pending_count"] += 1
        elif status == "confirmed":
            group["engineer_confirmed_status_count"] += 1
        elif status == "rejected":
            group["engineer_rejected_count"] += 1
        elif status == "sent_to_mes":
            group["engineer_sent_to_mes_count"] += 1

        if status in ["confirmed", "sent_to_mes"]:
            score = inspection_score_value(inspection)

            if score is not None:
                group["_confirmed_score_sum"] += score
                group["_confirmed_score_count"] += 1

    result = [finalize_model_group(group) for group in groups.values()]

    return sorted(
        result,
        key=lambda item: item["ai_checked_count"],
        reverse=True,
    )


@router.get("/shifts/{shift_id}")
def get_shift_details(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("stats.full_view")),
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
                "id": inspection.id,
                "ingot_id": inspection.ingot_id,
                "verdict": inspection.verdict,
                "has_defect": bool(inspection.has_defect),
                "max_p_crack": float(inspection.max_p_crack or 0),
                "confidence": float(inspection.confidence or 0),
                "threshold": float(inspection.threshold or 0),
                "mode": inspection.mode,
                "frames_count": inspection.frames_count,
                "ai_model_id": inspection.ai_model_id,
                "ai_model_key": inspection.ai_model_key,
                "ai_model_name": inspection.ai_model_name,
                "ai_model_type": inspection.ai_model_type,
                "ai_model_architecture": inspection.ai_model_architecture,
                "started_at": inspection.started_at.isoformat(timespec="seconds") if inspection.started_at else None,
                "finished_at": inspection.finished_at.isoformat(timespec="seconds") if inspection.finished_at else None,
            }
            for inspection in inspections
        ],
    }