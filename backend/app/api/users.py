# app/api/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.core.database import SessionLocal
from app.core.security import get_current_user, require_admin, hash_password
from app.models.user import User
from app.models.role import Role
from app.schemas.user import UserMe, UserCreate, UserUpdate, UserPublic, UserMeUpdate
from app.schemas.user import UserMe, UserMeUpdate
from app.core.security import get_current_user, hash_password
from app.core.database import get_db


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
    # убедимся, что role подгружена (если relationship lazy)
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
    # email unique
    if data.email and data.email != current_user.email:
        exists = db.query(User).filter(User.email == data.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")
        current_user.email = data.email

    # password
    if data.password:
        current_user.hashed_password = hash_password(data.password)

    # profile fields
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

# ---------------------------
# ADMIN CRUD
# ---------------------------

@router.get("", response_model=List[UserPublic])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    users = (
        db.query(User)
        .options(joinedload(User.role))
        .order_by(User.id.asc())
        .all()
    )
    return [to_user_public(u) for u in users]


@router.get("/{user_id}", response_model=UserPublic)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
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
    _: User = Depends(require_admin),
):
    # email unique
    exists = db.query(User).filter(User.email == data.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    # role exists
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

    # подгрузим роль для role_name
    u = db.query(User).options(joinedload(User.role)).filter(User.id == u.id).first()
    return to_user_public(u)


@router.put("/{user_id}", response_model=UserPublic)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Если меняем email — проверим уникальность
    if data.email and data.email != u.email:
        exists = db.query(User).filter(User.email == data.email).first()
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")
        u.email = data.email

    # Если меняем пароль
    if data.password:
        u.hashed_password = hash_password(data.password)

    # Остальные поля
    if data.last_name is not None:
        u.last_name = data.last_name
    if data.first_name is not None:
        u.first_name = data.first_name
    if data.patronymic is not None:
        u.patronymic = data.patronymic
    if data.phone is not None:
        u.phone = data.phone

    if data.is_active is not None:
        # (опционально) запретить админу деактивировать самого себя
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
    current_admin: User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # (опционально) запретить удалять самого себя
    if u.id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete yourself")

    db.delete(u)
    db.commit()
    return None
