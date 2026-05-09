from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    BigInteger
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True)
    
    file_path = Column(String, nullable=True)
    storage_type = Column(String(50), nullable=False, default="local", server_default="local")
    bucket = Column(String(255), nullable=True)
    object_key = Column(String, nullable=True)
    content_type = Column(String(100), nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    image_type = Column(String(50), default="best_frame")
    inspection_id = Column(Integer, ForeignKey("inspections.id", ondelete="CASCADE"))
    defect_id = Column(Integer, ForeignKey("defects.id", ondelete="CASCADE"))
    created_at = Column(DateTime, server_default=func.now())
    inspection = relationship("Inspection", back_populates="images")
    defect = relationship("Defect", back_populates="images")