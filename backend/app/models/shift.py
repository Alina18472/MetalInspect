from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True)

    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime, nullable=True)

    # running / finished / stopped / error
    status = Column(String(50), nullable=False, default="running")

    mode = Column(String(50), nullable=True)
    threshold = Column(Float, nullable=True)

    started_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    total_ingots = Column(Integer, default=0)
    processed_ingots = Column(Integer, default=0)

    total_crack = Column(Integer, default=0)
    total_ok = Column(Integer, default=0)

    defect_rate = Column(Float, default=0.0)
    avg_max_p_crack = Column(Float, default=0.0)
    avg_frames = Column(Float, default=0.0)

    error_message = Column(String, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    inspections = relationship(
        "Inspection",
        back_populates="shift"
    )