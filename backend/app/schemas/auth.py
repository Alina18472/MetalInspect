# app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None

    role_id: int
    role_name: Optional[str] = None  # если нужно отображать "Админ/Инженер"

    class Config:
        from_attributes = True  # pydantic v2 (если v1 — ниже напишу)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
