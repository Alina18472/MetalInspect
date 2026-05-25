# ai_model.py
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class AiModel(Base):
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True)
    model_key = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    model_type = Column(String(50), nullable=False)
    architecture = Column(String(100), nullable=False)
    weights_path = Column(String, nullable=True)
    classes = Column(JSONB, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="available", nullable=False)
    default_mode = Column(String(50), default="balanced", nullable=True)
    threshold = Column(Float, nullable=True)
    confidence_threshold = Column(Float, nullable=True)
    iou_threshold = Column(Float, nullable=True)
    modes = Column(JSONB, nullable=True)
    metrics = Column(JSONB, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())