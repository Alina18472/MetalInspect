# app/api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.core.database import SessionLocal
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserMe

router = APIRouter(prefix="/users", tags=["users"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/me", response_model=UserMe)
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_active": bool(current_user.is_active),
        "last_name": current_user.last_name,
        "first_name": current_user.first_name,
        "patronymic": current_user.patronymic,
        "phone": current_user.phone,
        "role_id": int(current_user.role_id),
        "role_name": current_user.role.name if current_user.role else None,
    }


@router.get("", response_model=List[UserMe])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if int(current_user.role_id) != 1:
        raise HTTPException(status_code=403, detail="Forbidden")

    users = db.query(User).options(joinedload(User.role)).order_by(User.id.asc()).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "is_active": bool(u.is_active),
            "last_name": u.last_name,
            "first_name": u.first_name,
            "patronymic": u.patronymic,
            "phone": u.phone,
            "role_id": int(u.role_id),
            "role_name": u.role.name if u.role else None,
        }
        for u in users
    ]
