from pathlib import Path
import json

import torch
import torch.nn as nn
from torchvision import models


BACKEND_DIR = Path(__file__).resolve().parents[1]

PT_WEIGHTS_PATH = BACKEND_DIR / "models_ml" / "best_weighted.pt"
ONNX_OUTPUT_PATH = BACKEND_DIR / "models_ml" / "resnet18_crack_ok.onnx"
META_OUTPUT_PATH = BACKEND_DIR / "models_ml" / "resnet18_crack_ok.onnx.meta.json"


def main():
    if not PT_WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"Не найден файл весов: {PT_WEIGHTS_PATH}")

    checkpoint = torch.load(PT_WEIGHTS_PATH, map_location="cpu")

    classes = checkpoint["classes"]
    img_size = int(checkpoint["img_size"])

    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(classes))
    model.load_state_dict(checkpoint["model_state"])
    model.eval()

    dummy_input = torch.randn(1, 3, img_size, img_size, dtype=torch.float32)

    ONNX_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model,
        dummy_input,
        str(ONNX_OUTPUT_PATH),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
    )

    meta = {
        "classes": classes,
        "img_size": img_size,
        "source_checkpoint": str(PT_WEIGHTS_PATH.relative_to(BACKEND_DIR)),
        "input_name": "input",
        "output_name": "logits",
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225],
        },
    }

    META_OUTPUT_PATH.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("ONNX export finished")
    print(f"ONNX: {ONNX_OUTPUT_PATH}")
    print(f"META: {META_OUTPUT_PATH}")
    print(f"classes: {classes}")
    print(f"img_size: {img_size}")


if __name__ == "__main__":
    main()