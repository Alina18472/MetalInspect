from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    last_name = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)
    patronymic = Column(String(100), nullable=True)
    phone = Column(String(30), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    role = relationship("Role")
