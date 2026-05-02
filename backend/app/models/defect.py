from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True)

    inspection_id = Column(
        Integer,
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False
    )

    defect_type = Column(String(100), default="crack")
    length_mm = Column(Float)
    confidence = Column(Float)

    # Старое поле можно оставить
    is_confirmed = Column(Boolean, default=False)

    # Новый нормальный статус для журнала
    status = Column(String(50), default="pending")  # pending / confirmed / rejected / sent_to_mes

    confirmed_by = Column(Integer, ForeignKey("users.id"))
    confirmed_at = Column(DateTime)

    engineer_comment = Column(Text)

    created_at = Column(DateTime, server_default=func.now())

    inspection = relationship("Inspection", back_populates="defects")

    images = relationship(
        "Image",
        back_populates="defect",
        cascade="all, delete-orphan"
    )