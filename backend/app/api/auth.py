# app/api/auth.py (или api/auth.py как у тебя)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.schemas.auth import LoginRequest, LoginResponse
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.role))  # чтобы role подтянулась одним запросом
        .filter(User.email == data.email)
        .first()
    )

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    if user.role_id is None:
        raise HTTPException(status_code=400, detail="User has no role assigned")

    token = create_access_token({
        "sub": str(user.id),
        "role_id": int(user.role_id),
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": bool(user.is_active),
            "last_name": user.last_name,
            "first_name": user.first_name,
            "patronymic": user.patronymic,
            "phone": user.phone,
            "role_id": int(user.role_id),
            "role_name": user.role.name if user.role else None,  # если в Role есть name
        }
    }
