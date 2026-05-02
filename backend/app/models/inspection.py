from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    Float,
    DateTime,
    ForeignKey,
    String,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True)

    # ID условного слитка из имени файлов: ingot_001, ingot_002 и т.д.
    ingot_id = Column(String(100), nullable=True, index=True)

    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)

    # Итог проверки слитка
    has_defect = Column(Boolean, nullable=False)
    verdict = Column(String(20), nullable=True)  # CRACK / OK

    # max_p_crack по всем кадрам слитка
    confidence = Column(Float)
    max_p_crack = Column(Float)

    # Параметры принятия решения
    threshold = Column(Float)
    mode = Column(String(50))

    # Сколько кадров вошло в сессию слитка
    frames_count = Column(Integer)

    created_by = Column(Integer, ForeignKey("users.id"))

    defects = relationship(
        "Defect",
        back_populates="inspection",
        cascade="all, delete-orphan"
    )

    images = relationship(
        "Image",
        back_populates="inspection",
        cascade="all, delete-orphan"
    )