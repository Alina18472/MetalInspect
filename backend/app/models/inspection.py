from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    Float,
    DateTime,
    ForeignKey
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True)

    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)

    has_defect = Column(Boolean, nullable=False)
    confidence = Column(Float)

    created_by = Column(Integer, ForeignKey("users.id"))

    defects = relationship(
        "Defect",
        back_populates="inspection",
        cascade="all, delete-orphan"
    )
