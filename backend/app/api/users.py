from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.core.security import require_permission
from app.core.database import SessionLocal
from app.core.security import get_current_user, require_admin, hash_password
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserMe, UserCreate, UserUpdate, UserPublic, UserMeUpdate
from app.schemas.user import UserMe, UserMeUpdate
from app.core.security import get_current_user, hash_password
from app.core.database import get_db
from datetime import date, datetime, time
from fastapi import Query
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.models.shift import Shift
from app.models.defect import Defect
from app.models.inspection import Inspection

router = APIRouter(prefix="/users", tags=["users"])





def to_user_public(u: User) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "is_active": bool(u.is_active),
        "last_name": u.last_name,
        "first_name": u.first_name,
        "patronymic": u.patronymic,
        "phone": u.phone,
        "role_id": int(u.role_id) if u.role_id is not None else None,
     
    }


@router.get("/me", response_model=UserMe)
def me(current_user: User = Depends(get_current_user)):
    role_name = current_user.role.name if current_user.role else None

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": bool(current_user.is_active),
        "last_name": current_user.last_name,
        "first_name": current_user.first_name,
        "patronymic": current_user.patronymic,
        "phone": current_user.phone,
        "role_id": int(current_user.role_id),
       
    }

@router.put("/me", response_model=UserMe)
def update_me(
    data: UserMeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.email and data.email != current_user.email:
        exists = db.query(User).filter(User.email == data.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")
        current_user.email = data.email

    if data.password:
        current_user.hashed_password = hash_password(data.password)

    if data.last_name is not None:
        current_user.last_name = data.last_name
    if data.first_name is not None:
        current_user.first_name = data.first_name
    if data.patronymic is not None:
        current_user.patronymic = data.patronymic
    if data.phone is not None:
        current_user.phone = data.phone

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": bool(current_user.is_active),
        "last_name": current_user.last_name,
        "first_name": current_user.first_name,
        "patronymic": current_user.patronymic,
        "phone": current_user.phone,
        "role_id": int(current_user.role_id),
        
    }
@router.get("/me/activity")
def get_my_activity(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
   

    today_start = datetime.combine(date.today(), time.min)

    activity_time = func.coalesce(Defect.confirmed_at, Defect.created_at)

    inspections_total = (
        db.query(Inspection)
        .filter(Inspection.created_by == current_user.id)
        .count()
    )

    inspections_today = (
        db.query(Inspection)
        .filter(
            Inspection.created_by == current_user.id,
            Inspection.started_at >= today_start,
        )
        .count()
    )

    reviewed_query = db.query(Defect).filter(Defect.confirmed_by == current_user.id)

    reviewed_total = reviewed_query.count()

    confirmed_total = (
        reviewed_query
        .filter(Defect.status == "confirmed")
        .count()
    )

    rejected_total = (
        reviewed_query
        .filter(Defect.status == "rejected")
        .count()
    )

    reviewed_today = (
        reviewed_query
        .filter(activity_time >= today_start)
        .count()
    )

    last_activity_at = (
        db.query(func.max(activity_time))
        .filter(Defect.confirmed_by == current_user.id)
        .scalar()
    )

    false_alarm_rate = (
        rejected_total / reviewed_total * 100.0
        if reviewed_total > 0
        else 0.0
    )

    recent_rows = (
        db.query(Defect, Inspection)
        .join(Inspection, Inspection.id == Defect.inspection_id)
        .filter(Defect.confirmed_by == current_user.id)
        .order_by(activity_time.desc(), Defect.id.desc())
        .limit(limit)
        .all()
    )

    recent_events = []

    for defect, inspection in recent_rows:
        event_time = defect.confirmed_at or defect.created_at

        recent_events.append({
            "defect_id": defect.id,
            "inspection_id": inspection.id,
            "shift_id": inspection.shift_id,
            "ingot_id": inspection.ingot_id,
            "source_ingot_id": inspection.source_ingot_id,
            "cycle_number": inspection.cycle_number,
            "sequence_number": inspection.sequence_number,

            "status": defect.status,
            "defect_type": defect.defect_type,
            "comment": defect.comment,
            "confidence": float(defect.confidence or 0),

            "max_p_crack": float(inspection.max_p_crack or 0),
            "threshold": float(inspection.threshold or 0),
            "mode": inspection.mode,
            "verdict": inspection.verdict,

            "ai_model_id": inspection.ai_model_id,
            "ai_model_key": inspection.ai_model_key,
            "ai_model_name": inspection.ai_model_name,
            "ai_model_type": inspection.ai_model_type,
            "ai_model_architecture": inspection.ai_model_architecture,

            "time": event_time.isoformat(timespec="seconds") if event_time else None,
        })

    return {
        "summary": {
            "inspections_total": inspections_total,
            "inspections_today": inspections_today,

            "reviewed_total": reviewed_total,
            "reviewed_today": reviewed_today,
            "confirmed_total": confirmed_total,
            "rejected_total": rejected_total,

            "false_alarm_rate": false_alarm_rate,
            "last_activity_at": (
                last_activity_at.isoformat(timespec="seconds")
                if last_activity_at
                else None
            ),
        },
        "recent_events": recent_events,
    }
    
def get_user_usage(db: Session, user_id: int) -> dict:
    inspections_created = (
        db.query(Inspection)
        .filter(Inspection.created_by == user_id)
        .count()
    )

    defects_confirmed = (
        db.query(Defect)
        .filter(Defect.confirmed_by == user_id)
        .count()
    )

    shifts_started = (
        db.query(Shift)
        .filter(Shift.started_by == user_id)
        .count()
    )

    total = inspections_created + defects_confirmed + shifts_started

    return {
        "inspections_created": inspections_created,
        "defects_confirmed": defects_confirmed,
        "shifts_started": shifts_started,
        "total": total,
    }
    
@router.get("", response_model=List[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users.manage")),
):
    users = (
        db.query(User)
        .options(joinedload(User.role))
        .order_by(User.id.asc())
        .all()
    )
    return [to_user_public(u) for u in users]

@router.get("/{user_id}/delete-check")
def check_user_delete(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_permission("users.manage")),
):
    user_to_check = db.query(User).filter(User.id == user_id).first()

    if not user_to_check:
        raise HTTPException(status_code=404, detail="User not found")

    usage = get_user_usage(db, user_id)

    is_self = current_admin.id == user_id
    has_links = usage["total"] > 0

    reasons = []

    if is_self:
        reasons.append("Нельзя удалить собственный аккаунт администратора")

    if has_links:
        reasons.append(
            "Пользователь связан с журналом, сменами или подтверждёнными событиями"
        )

    can_delete = not is_self and not has_links

    return {
        "user_id": user_id,
        "can_delete": can_delete,
        "can_deactivate": not is_self and bool(user_to_check.is_active),
        "recommended_action": "delete" if can_delete else "deactivate",
        "usage": usage,
        "reasons": reasons,
        "message": (
            "Пользователя можно удалить"
            if can_delete
            else "Пользователя нельзя безопасно удалить, рекомендуется деактивировать аккаунт"
        ),
    }
@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users.manage")),
):
    u = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == user_id)
        .first()
    )
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return to_user_public(u)


@router.post("", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users.manage")),
):
    exists = db.query(User).filter(User.email == data.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    role = db.query(Role).filter(Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")

    u = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        is_active=bool(data.is_active),
        last_name=data.last_name,
        first_name=data.first_name,
        patronymic=data.patronymic,
        phone=data.phone,
        role_id=int(data.role_id),
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    u = db.query(User).options(joinedload(User.role)).filter(User.id == u.id).first()
    return to_user_public(u)


@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_permission("users.manage")),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email and data.email != u.email:
        exists = db.query(User).filter(User.email == data.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")
        u.email = data.email

    if data.password:
        u.hashed_password = hash_password(data.password)

    if data.last_name is not None:
        u.last_name = data.last_name
    if data.first_name is not None:
        u.first_name = data.first_name
    if data.patronymic is not None:
        u.patronymic = data.patronymic
    if data.phone is not None:
        u.phone = data.phone

    if data.is_active is not None:
        if u.id == current_admin.id and data.is_active is False:
            raise HTTPException(status_code=400, detail="You cannot deactivate yourself")
        u.is_active = bool(data.is_active)

    if data.role_id is not None:
        role = db.query(Role).filter(Role.id == int(data.role_id)).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        u.role_id = int(data.role_id)

    db.commit()

    u = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == user_id)
        .first()
    )
    return to_user_public(u)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_permission("users.manage")),
):
    u = db.query(User).filter(User.id == user_id).first()

    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if u.id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить собственный аккаунт",
        )

    usage = get_user_usage(db, user_id)

    if usage["total"] > 0:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Пользователь связан с журналом, сменами или событиями. Удаление запрещено, используйте деактивацию аккаунта.",
                "can_delete": False,
                "can_deactivate": bool(u.is_active),
                "recommended_action": "deactivate",
                "usage": usage,
            },
        )

    try:
        db.delete(u)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Пользователь связан с другими данными. Удаление запрещено, используйте деактивацию аккаунта.",
                "can_delete": False,
                "can_deactivate": bool(u.is_active),
                "recommended_action": "deactivate",
                "usage": usage,
            },
        )

    return None