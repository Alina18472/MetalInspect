from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class AiModel(Base):
    __tablename__ = "ai_models"

    id = Column(Integer, primary_key=True)

    # Уникальный технический ключ модели
    # Например: resnet18_crack_ok_v1
    model_key = Column(String(100), unique=True, nullable=False)

    # Отображаемое название
    name = Column(String(200), nullable=False)

    # Тип модели:
    # classification / detection
    model_type = Column(String(50), nullable=False)

    # Архитектура:
    # ResNet18 / YOLOv8 / EfficientNet и т.д.
    architecture = Column(String(100), nullable=False)

    # Путь к весам относительно backend/
    # Например: models/best_weighted.pt
    weights_path = Column(String, nullable=True)

    # Список классов:
    # ["crack", "ok"] или ["crack"]
    classes = Column(JSONB, nullable=True)

    # Активна ли модель сейчас
    is_active = Column(Boolean, default=False, nullable=False)

    # Статус модели:
    # available / planned / disabled / error
    status = Column(String(50), default="available", nullable=False)

    # Основной режим:
    # strict / balanced / sensitive
    default_mode = Column(String(50), default="balanced", nullable=True)

    # Основной threshold для классификации
    threshold = Column(Float, nullable=True)

    # Для detection-моделей типа YOLO
    confidence_threshold = Column(Float, nullable=True)
    iou_threshold = Column(Float, nullable=True)

    # Набор режимов:
    # {"strict": 0.65, "balanced": 0.465, "sensitive": 0.35}
    modes = Column(JSONB, nullable=True)

    # Метрики обучения / тестирования
    # {"recall_crack": 0.988, "precision": 0.95, "fn": 1}
    metrics = Column(JSONB, nullable=True)

    # Дополнительное описание
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())