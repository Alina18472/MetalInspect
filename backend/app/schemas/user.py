# app/schemas/user.py
from pydantic import BaseModel, EmailStr
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
