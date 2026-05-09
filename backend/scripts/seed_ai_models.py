from app.core.database import SessionLocal
from app.models.ai_model import AiModel


def upsert_model(db, data: dict):
    model = db.query(AiModel).filter(AiModel.model_key == data["model_key"]).first()

    if model:
        for key, value in data.items():
            setattr(model, key, value)
    else:
        model = AiModel(**data)
        db.add(model)

    db.commit()
    db.refresh(model)
    return model


def main():
    db = SessionLocal()

    try:
        db.query(AiModel).update({AiModel.is_active: False})
        db.commit()

        resnet = {
            "model_key": "resnet18_crack_ok_v1",
            "name": "ResNet18 crack/ok classifier",
            "model_type": "classification",
            "architecture": "ResNet18",
            "weights_path": "models/best_weighted.pt",
            "classes": ["crack", "ok"],
            "is_active": True,
            "status": "available",
            "default_mode": "balanced",
            "threshold": 0.465,
            "confidence_threshold": None,
            "iou_threshold": None,
            "modes": {
                "strict": 0.65,
                "balanced": 0.465,
                "sensitive": 0.35
            },
            "metrics": {
                "recall_crack": 0.988,
                "precision_min": 0.95,
                "false_negative": 1,
                "threshold": 0.465
            },
            "description": (
                "Бинарная классификационная модель crack / ok на базе ResNet18. "
                "Используется как основная модель текущего веб-прототипа. "
                "Threshold 0.465 выбран после tuning с приоритетом минимизации False Negative."
            ),
        }

        yolo = {
            "model_key": "yolov8_crack_detector_v1",
            "name": "YOLOv8 crack detector",
            "model_type": "detection",
            "architecture": "YOLOv8",
            "weights_path": "models/yolov8_crack.pt",
            "classes": ["crack"],
            "is_active": False,
            "status": "planned",
            "default_mode": "balanced",
            "threshold": None,
            "confidence_threshold": 0.35,
            "iou_threshold": 0.5,
            "modes": {
                "strict": 0.5,
                "balanced": 0.35,
                "sensitive": 0.25
            },
            "metrics": {},
            "description": (
                "Планируемая detection-модель для локализации трещин с bbox. "
                "Пока не подключена к промышленному pipeline веб-приложения."
            ),
        }

        upsert_model(db, resnet)
        upsert_model(db, yolo)

        print("AI models seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    main()