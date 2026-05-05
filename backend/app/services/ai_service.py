# import os
# import io
# from typing import Optional

# import torch
# import torch.nn as nn
# from torchvision import models, transforms
# from PIL import Image


# DEFAULT_MODEL_PATH = os.path.abspath(
#     os.path.join(os.path.dirname(__file__), "..", "..", "models_ml", "best_weighted.pt")
# )

# MODE_PRESETS = {
#     "strict": {
#         "title": "Меньше ложных срабатываний / больше пропусков",
#         "threshold": 0.65,
#     },
#     "balanced": {
#         "title": "Сбалансированный режим",
#         "threshold": 0.465,
#     },
#     "sensitive": {
#         "title": "Больше ложных срабатываний / меньше пропусков",
#         "threshold": 0.35,
#     },
# }


# class AIService:
#     def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
#         self.model_path = model_path
#         self.model = None
#         self.tf = None
#         self.classes = None
#         self.device = None
#         self.img_size = None

#     def load_model(self):
#         if not os.path.exists(self.model_path):
#             raise FileNotFoundError(f"Файл модели не найден: {self.model_path}")

#         self.device = "cuda" if torch.cuda.is_available() else "cpu"

#         ckpt = torch.load(self.model_path, map_location=self.device)

#         self.classes = ckpt["classes"]
#         self.img_size = ckpt["img_size"]

#         model = models.resnet18(weights=None)
#         model.fc = nn.Linear(model.fc.in_features, len(self.classes))
#         model.load_state_dict(ckpt["model_state"])
#         model.to(self.device)
#         model.eval()

#         self.model = model

#         self.tf = transforms.Compose([
#             transforms.Resize((self.img_size, self.img_size)),
#             transforms.ToTensor(),
#             transforms.Normalize(
#                 mean=[0.485, 0.456, 0.406],
#                 std=[0.229, 0.224, 0.225],
#             ),
#         ])

#         if "crack" not in self.classes or "ok" not in self.classes:
#             raise ValueError(f"Ожидались классы crack/ok, получено: {self.classes}")

#         return self

#     def ensure_loaded(self):
#         if self.model is None:
#             self.load_model()

#     def get_model_info(self):
#         self.ensure_loaded()

#         return {
#             "model_path": self.model_path,
#             "classes": self.classes,
#             "img_size": self.img_size,
#             "device": self.device,
#             "mode_presets": MODE_PRESETS,
#         }

#     @torch.no_grad()
#     def predict_pil(
#         self,
#         pil_img: Image.Image,
#         threshold: Optional[float] = None,
#         mode: str = "balanced",
#     ):
#         self.ensure_loaded()

#         if threshold is None:
#             threshold = MODE_PRESETS.get(mode, MODE_PRESETS["balanced"])["threshold"]

#         if not 0 <= float(threshold) <= 1:
#             raise ValueError("threshold должен быть в диапазоне от 0 до 1")

#         img = pil_img.convert("RGB")
#         x = self.tf(img).unsqueeze(0).to(self.device)

#         logits = self.model(x)
#         probs = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

#         crack_idx = self.classes.index("crack")
#         ok_idx = self.classes.index("ok")

#         p_crack = float(probs[crack_idx])
#         p_ok = float(probs[ok_idx])

#         verdict = "CRACK" if p_crack >= float(threshold) else "OK"
#         confidence = p_crack if verdict == "CRACK" else p_ok

#         return {
#             "verdict": verdict,
#             "p_crack": p_crack,
#             "p_ok": p_ok,
#             "confidence": confidence,
#             "threshold": float(threshold),
#             "mode": mode,
#             "classes": self.classes,
#         }

#     def predict_bytes(
#         self,
#         image_bytes: bytes,
#         threshold: Optional[float] = None,
#         mode: str = "balanced",
#     ):
#         pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
#         return self.predict_pil(pil_img, threshold=threshold, mode=mode)


# ai_service = AIService()
from pathlib import Path
from threading import Lock
from typing import Optional

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

from app.core.database import SessionLocal
from app.models.ai_model import AiModel


# Fallback, чтобы старый код не сломался
MODE_PRESETS = {
    "strict": {
        "title": "Меньше ложных срабатываний / больше пропусков",
        "threshold": 0.65,
    },
    "balanced": {
        "title": "Сбалансированный режим",
        "threshold": 0.465,
    },
    "sensitive": {
        "title": "Больше ложных срабатываний / меньше пропусков",
        "threshold": 0.35,
    },
}


BACKEND_DIR = Path(__file__).resolve().parents[2]


class AiService:
    def __init__(self):
        self._lock = Lock()

        self.model = None
        self.tf = None
        self.classes = None
        self.device = None

        self.active_model_id = None
        self.active_model_key = None
        self.active_model_name = None
        self.active_model_type = None
        self.active_architecture = None

        self.active_threshold = None
        self.active_confidence_threshold = None
        self.active_iou_threshold = None
        self.active_default_mode = None
        self.active_modes = None
        self.active_metrics = None
        self.active_weights_path = None

    def _resolve_weights_path(self, weights_path: str) -> Path:
        path = Path(weights_path)

        if path.is_absolute():
            return path

        return BACKEND_DIR / path

    def _load_resnet18_checkpoint(self, weights_path: Path):
        device = "cuda" if torch.cuda.is_available() else "cpu"

        ckpt = torch.load(weights_path, map_location=device)

        classes = ckpt["classes"]
        img_size = ckpt["img_size"]

        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, len(classes))
        model.load_state_dict(ckpt["model_state"])
        model.to(device)
        model.eval()

        tf = transforms.Compose([
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        return model, tf, classes, device

    def reload_active_model(self):
        """
        Загружает активную модель из таблицы ai_models.

        Сейчас поддерживается:
        - classification + ResNet18

        YOLO/detection добавим отдельным этапом.
        """
        db = SessionLocal()

        try:
            model_row = (
                db.query(AiModel)
                .filter(AiModel.is_active == True)
                .first()
            )

            if not model_row:
                raise RuntimeError("В таблице ai_models нет активной модели")

            if model_row.status != "available":
                raise RuntimeError(
                    f"Активная модель имеет статус '{model_row.status}', а нужен 'available'"
                )

            if model_row.model_type != "classification":
                raise RuntimeError(
                    f"Сейчас ai_service поддерживает только classification. "
                    f"Получено: {model_row.model_type}"
                )

            if model_row.architecture != "ResNet18":
                raise RuntimeError(
                    f"Сейчас поддерживается только ResNet18. "
                    f"Получено: {model_row.architecture}"
                )

            if not model_row.weights_path:
                raise RuntimeError("У активной модели не указан weights_path")

            weights_path = self._resolve_weights_path(model_row.weights_path)

            if not weights_path.exists():
                raise RuntimeError(f"Файл весов не найден: {weights_path}")

            loaded_model, tf, classes, device = self._load_resnet18_checkpoint(weights_path)

            if "crack" not in classes or "ok" not in classes:
                raise RuntimeError(f"Ожидались классы crack/ok, получено: {classes}")

            with self._lock:
                self.model = loaded_model
                self.tf = tf
                self.classes = classes
                self.device = device

                self.active_model_id = model_row.id
                self.active_model_key = model_row.model_key
                self.active_model_name = model_row.name
                self.active_model_type = model_row.model_type
                self.active_architecture = model_row.architecture

                self.active_threshold = model_row.threshold
                self.active_confidence_threshold = model_row.confidence_threshold
                self.active_iou_threshold = model_row.iou_threshold
                self.active_default_mode = model_row.default_mode
                self.active_modes = model_row.modes
                self.active_metrics = model_row.metrics
                self.active_weights_path = model_row.weights_path

            return self.get_active_model_runtime_info()

        finally:
            db.close()

    def ensure_model_loaded(self):
        with self._lock:
            already_loaded = self.model is not None

        if not already_loaded:
            self.reload_active_model()

    def get_threshold_for_mode(
        self,
        mode: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> float:
        """
        Приоритет:
        1. threshold, если явно передали;
        2. threshold из режима active model;
        3. threshold активной модели;
        4. fallback balanced = 0.465.
        """
        if threshold is not None:
            return float(threshold)

        self.ensure_model_loaded()

        with self._lock:
            selected_mode = mode or self.active_default_mode or "balanced"
            modes = self.active_modes or {}
            active_threshold = self.active_threshold

        if selected_mode in modes:
            return float(modes[selected_mode])

        if active_threshold is not None:
            return float(active_threshold)

        return float(MODE_PRESETS["balanced"]["threshold"])

    def get_active_model_runtime_info(self):
        self.ensure_model_loaded()

        with self._lock:
            return {
                "id": self.active_model_id,
                "model_key": self.active_model_key,
                "name": self.active_model_name,
                "model_type": self.active_model_type,
                "architecture": self.active_architecture,
                "weights_path": self.active_weights_path,
                "classes": self.classes,
                "device": self.device,
                "default_mode": self.active_default_mode,
                "threshold": self.active_threshold,
                "confidence_threshold": self.active_confidence_threshold,
                "iou_threshold": self.active_iou_threshold,
                "modes": self.active_modes,
                "metrics": self.active_metrics,
                "loaded": self.model is not None,
            }

    @torch.no_grad()
    def predict_pil(
        self,
        pil_img: Image.Image,
        threshold: Optional[float] = None,
        mode: Optional[str] = None,
    ):
        self.ensure_model_loaded()

        actual_threshold = self.get_threshold_for_mode(mode=mode, threshold=threshold)

        with self._lock:
            model = self.model
            tf = self.tf
            classes = self.classes
            device = self.device

            model_id = self.active_model_id
            model_key = self.active_model_key
            model_name = self.active_model_name
            model_type = self.active_model_type
            architecture = self.active_architecture

        x = tf(pil_img).unsqueeze(0).to(device)

        logits = model(x)
        probs_tensor = torch.softmax(logits, dim=1).squeeze(0).cpu()
        probs = probs_tensor.tolist()

        crack_idx = classes.index("crack")
        ok_idx = classes.index("ok")

        p_crack = float(probs[crack_idx])
        p_ok = float(probs[ok_idx])

        verdict = "CRACK" if p_crack >= actual_threshold else "OK"
        confidence = p_crack if verdict == "CRACK" else p_ok

        return {
            "model_id": model_id,
            "model_key": model_key,
            "model_name": model_name,
            "model_type": model_type,
            "architecture": architecture,

            "verdict": verdict,
            "p_crack": p_crack,
            "p_ok": p_ok,
            "confidence": float(confidence),
            "threshold": float(actual_threshold),
            "mode": mode or self.active_default_mode or "balanced",
            "classes": classes,

            # Для совместимости с будущим YOLO
            "detections": [],
        }


ai_service = AiService()