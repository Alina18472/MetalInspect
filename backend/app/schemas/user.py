# app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserMe(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None

    role_id: int
    role_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- NEW: CRUD schemas ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None

    role_id: int
    is_active: bool = True


class UserUpdate(BaseModel):
    # всё опционально
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None

    role_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None

    role_id: int
    role_name: Optional[str] = None

    class Config:
        from_attributes = True

class UserMeUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    patronymic: Optional[str] = None
    phone: Optional[str] = None