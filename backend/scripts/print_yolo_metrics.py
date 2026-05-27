import argparse
import json
from pathlib import Path

from ultralytics import YOLO


def safe_float(value):
    try:
        return float(value)
    except Exception:
        return None


def get_box_metrics(result):
    box = getattr(result, "box", None)

    return {
        "precision": safe_float(getattr(box, "mp", None)),
        "recall": safe_float(getattr(box, "mr", None)),
        "map50": safe_float(getattr(box, "map50", None)),
        "map50_95": safe_float(getattr(box, "map", None)),
    }


def evaluate_mode(model, data_yaml, split, mode_name, conf, iou, imgsz, max_det, batch):
    print(
        f"\n=== {mode_name}: conf={conf}, iou={iou}, imgsz={imgsz}, max_det={max_det} ==="
    )

    result = model.val(
        data=str(data_yaml),
        split=split,
        imgsz=int(imgsz),
        batch=int(batch),
        conf=float(conf),
        iou=float(iou),
        max_det=int(max_det),
        verbose=False,
        plots=False,
        save_json=False,
    )

    metrics = get_box_metrics(result)

    return {
        "confidence_threshold": float(conf),
        "iou_threshold": float(iou),
        "imgsz": int(imgsz),
        "max_det": int(max_det),
        **metrics,
    }


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--model", required=True, help="Путь к .pt/.onnx/OpenVINO YOLO модели")
    parser.add_argument("--data", required=True, help="Путь к dataset.yaml")
    parser.add_argument("--split", default="val", choices=["train", "val", "test"])
    parser.add_argument("--imgsz", type=int, required=True)
    parser.add_argument("--max-det", type=int, default=5)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--default-mode", default="sensitive")

    args = parser.parse_args()

    model_path = Path(args.model)
    data_yaml = Path(args.data)

    if not model_path.exists():
        raise FileNotFoundError(f"Модель не найдена: {model_path}")

    if not data_yaml.exists():
        raise FileNotFoundError(f"dataset.yaml не найден: {data_yaml}")

    model = YOLO(str(model_path), task="detect")

    mode_configs = {
        "strict": {
            "conf": 0.35,
            "iou": 0.45,
        },
        "balanced": {
            "conf": 0.25,
            "iou": 0.45,
        },
        "sensitive": {
            "conf": 0.15,
            "iou": 0.45,
        },
    }

    by_mode = {}

    for mode_name, cfg in mode_configs.items():
        by_mode[mode_name] = evaluate_mode(
            model=model,
            data_yaml=data_yaml,
            split=args.split,
            mode_name=mode_name,
            conf=cfg["conf"],
            iou=cfg["iou"],
            imgsz=args.imgsz,
            max_det=args.max_det,
            batch=args.batch,
        )

    default_mode = args.default_mode
    default_metrics = by_mode.get(default_mode) or by_mode["sensitive"]

    output = {
        "task": "detection",
        "runtime": "ultralytics",
        "weights_path": str(model_path).replace("\\", "/"),
        "data_yaml": str(data_yaml).replace("\\", "/"),
        "split": args.split,
        "default_mode": default_mode,
        "by_mode": by_mode,
        **default_metrics,
    }

    print("\n=== METRICS_JSON_START ===")
    print(json.dumps(output, ensure_ascii=False, indent=2))
    print("=== METRICS_JSON_END ===")


if __name__ == "__main__":
    main()