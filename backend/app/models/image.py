from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True)

    file_path = Column(String, nullable=False)

    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    defect_id = Column(Integer, ForeignKey("defects.id"))

    created_at = Column(DateTime, server_default=func.now())
