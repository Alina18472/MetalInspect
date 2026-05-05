from app.core.database import SessionLocal
from app.models.ai_model import AiModel


YOLO_MODEL_KEY = "yolov8n_crack_experimental"


def main():
    db = SessionLocal()

    try:
        existing = (
            db.query(AiModel)
            .filter(AiModel.model_key == YOLO_MODEL_KEY)
            .first()
        )

        yolo_modes = {
            "detection": {
                "label": "Детекция дефектов",
                "description": "Поиск области трещины на изображении с помощью bounding box",
                "confidence_threshold": 0.25,
                "iou_threshold": 0.45,
            }
        }

        metrics = {
            "dataset": "NEU-DET / GC10-DET, подготовленный для YOLO",
            "training_script": "train_yolo.py",
            "base_model": "yolov8n.pt",
            "run_name": "crack_yolov8n_v2",
            "epochs": 50,
            "imgsz": 640,
            "batch": 8,
            "optimizer": "AdamW",

            "precision": 0.7513,
            "recall": 0.5325,
            "map50": 0.6723,
            "map50_95": 0.3594,

            "quality_note": (
                "Экспериментальная detection-модель. "
                "Вторая попытка обучения показала лучшие метрики, "
                "но recall остаётся недостаточным для использования в основном режиме. "
                "Модель требует улучшения разметки и повторного обучения."
            ),
        }

        if existing:
            existing.name = "YOLOv8n crack detector"
            existing.description = (
                "Экспериментальная YOLOv8n-модель для локализации трещин. "
                "Добавлена как перспективное расширение системы для отображения bbox. "
                "Основной рабочей моделью остаётся ResNet18."
            )
            existing.model_type = "detection"
            existing.architecture = "YOLOv8n"
            existing.weights_path = "./models_ml/yolo_crack_best.pt"
            existing.status = "experimental"
            existing.is_active = False
            existing.threshold = None
            existing.confidence_threshold = 0.25
            existing.iou_threshold = 0.45
            existing.default_mode = "detection"
            existing.modes = yolo_modes
            existing.metrics = metrics

            print("YOLO model updated")
        else:
            model = AiModel(
                model_key=YOLO_MODEL_KEY,
                name="YOLOv8n crack detector",
                description=(
                    "Экспериментальная YOLOv8n-модель для локализации трещин. "
                    "Добавлена как перспективное расширение системы для отображения bbox. "
                    "Основной рабочей моделью остаётся ResNet18."
                ),
                model_type="detection",
                architecture="YOLOv8n",
                weights_path="./models_ml/yolo_crack_best.pt",
                status="experimental",
                is_active=False,
                threshold=None,
                confidence_threshold=0.25,
                iou_threshold=0.45,
                default_mode="detection",
                modes=yolo_modes,
                metrics=metrics,
            )

            db.add(model)
            print("YOLO model created")

        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    main()