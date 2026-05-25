from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class MesEvent(Base):
    __tablename__ = "mes_events"

    id = Column(Integer, primary_key=True)

    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="SET NULL"), nullable=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True)

    ingot_id = Column(String(100), nullable=True)
    external_event_id = Column(String(100), unique=True, nullable=False)

    payload = Column(JSONB, nullable=False)

    status = Column(String(50), nullable=False, default="accepted")
    response_message = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    processed_at = Column(DateTime, nullable=True)