# inspection.py
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
    source_ingot_id = Column(String(100), nullable=True)
    cycle_number = Column(Integer, nullable=True)
    sequence_number = Column(Integer, nullable=True)
    ingot_id = Column(String(100), nullable=True, index=True)
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)
    has_defect = Column(Boolean, nullable=False)
    verdict = Column(String(20), nullable=True)  
    confidence = Column(Float)
    max_p_crack = Column(Float)
    threshold = Column(Float)
    mode = Column(String(50))
    frames_count = Column(Integer)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True, index=True)
    shift = relationship("Shift", back_populates="inspections")
    ai_model_id = Column(Integer, ForeignKey("ai_models.id", ondelete="SET NULL"), nullable=True)
    ai_model_key = Column(String(100), nullable=True)
    ai_model_name = Column(String(255), nullable=True)
    ai_model_type = Column(String(50), nullable=True)
    ai_model_architecture = Column(String(100), nullable=True)
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