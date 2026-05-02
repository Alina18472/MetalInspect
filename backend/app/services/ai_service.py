import os
import io
from typing import Optional

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image


DEFAULT_MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "models_ml", "best_weighted.pt")
)

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


class AIService:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.tf = None
        self.classes = None
        self.device = None
        self.img_size = None

    def load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Файл модели не найден: {self.model_path}")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        ckpt = torch.load(self.model_path, map_location=self.device)

        self.classes = ckpt["classes"]
        self.img_size = ckpt["img_size"]

        model = models.resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, len(self.classes))
        model.load_state_dict(ckpt["model_state"])
        model.to(self.device)
        model.eval()

        self.model = model

        self.tf = transforms.Compose([
            transforms.Resize((self.img_size, self.img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        if "crack" not in self.classes or "ok" not in self.classes:
            raise ValueError(f"Ожидались классы crack/ok, получено: {self.classes}")

        return self

    def ensure_loaded(self):
        if self.model is None:
            self.load_model()

    def get_model_info(self):
        self.ensure_loaded()

        return {
            "model_path": self.model_path,
            "classes": self.classes,
            "img_size": self.img_size,
            "device": self.device,
            "mode_presets": MODE_PRESETS,
        }

    @torch.no_grad()
    def predict_pil(
        self,
        pil_img: Image.Image,
        threshold: Optional[float] = None,
        mode: str = "balanced",
    ):
        self.ensure_loaded()

        if threshold is None:
            threshold = MODE_PRESETS.get(mode, MODE_PRESETS["balanced"])["threshold"]

        if not 0 <= float(threshold) <= 1:
            raise ValueError("threshold должен быть в диапазоне от 0 до 1")

        img = pil_img.convert("RGB")
        x = self.tf(img).unsqueeze(0).to(self.device)

        logits = self.model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0).cpu().tolist()

        crack_idx = self.classes.index("crack")
        ok_idx = self.classes.index("ok")

        p_crack = float(probs[crack_idx])
        p_ok = float(probs[ok_idx])

        verdict = "CRACK" if p_crack >= float(threshold) else "OK"
        confidence = p_crack if verdict == "CRACK" else p_ok

        return {
            "verdict": verdict,
            "p_crack": p_crack,
            "p_ok": p_ok,
            "confidence": confidence,
            "threshold": float(threshold),
            "mode": mode,
            "classes": self.classes,
        }

    def predict_bytes(
        self,
        image_bytes: bytes,
        threshold: Optional[float] = None,
        mode: str = "balanced",
    ):
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self.predict_pil(pil_img, threshold=threshold, mode=mode)


ai_service = AIService()