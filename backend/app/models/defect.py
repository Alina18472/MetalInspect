from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey
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

    defect_type = Column(String(100))
    length_mm = Column(Float)
    confidence = Column(Float)

    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"))

    created_at = Column(DateTime, server_default=func.now())

    inspection = relationship("Inspection", back_populates="defects")
