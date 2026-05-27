import argparse
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from PIL import Image
from torchvision import transforms


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def load_meta(onnx_path: Path, fallback_classes, fallback_img_size):
    candidates = [
        onnx_path.with_suffix(onnx_path.suffix + ".meta.json"),
        onnx_path.with_suffix(onnx_path.suffix + ".metadata.json"),
        onnx_path.with_suffix(".meta.json"),
        onnx_path.with_suffix(".metadata.json"),
    ]

    for path in candidates:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))

    return {
        "classes": fallback_classes,
        "img_size": fallback_img_size,
    }


def list_images(dataset_dir: Path):
    items = []

    for class_name in ["crack", "ok"]:
        class_dir = dataset_dir / class_name

        if not class_dir.exists():
            raise FileNotFoundError(
                f"Не найдена папка {class_dir}. "
                "Ожидается структура: dataset_dir/crack и dataset_dir/ok"
            )

        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                items.append((path, class_name))

    if not items:
        raise RuntimeError(f"В {dataset_dir} не найдено изображений")

    return items


def softmax(logits):
    logits = logits - np.max(logits, axis=1, keepdims=True)
    exp = np.exp(logits)
    return exp / np.sum(exp, axis=1, keepdims=True)


def calc_metrics(y_true, p_crack_values, threshold):
    tp = fp = tn = fn = 0

    for true_label, p_crack in zip(y_true, p_crack_values):
        pred_label = "crack" if p_crack >= threshold else "ok"

        if true_label == "crack" and pred_label == "crack":
            tp += 1
        elif true_label == "crack" and pred_label == "ok":
            fn += 1
        elif true_label == "ok" and pred_label == "crack":
            fp += 1
        elif true_label == "ok" and pred_label == "ok":
            tn += 1

    total = tp + fp + tn + fn

    accuracy = (tp + tn) / total if total else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall_crack = tp / (tp + fn) if (tp + fn) else 0.0

    f1 = (
        2 * precision * recall_crack / (precision + recall_crack)
        if (precision + recall_crack)
        else 0.0
    )

    return {
        "threshold": float(threshold),
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall_crack),
        "recall_crack": float(recall_crack),
        "f1": float(f1),
        "tp": int(tp),
        "fp": int(fp),
        "tn": int(tn),
        "fn": int(fn),
        "false_positive": int(fp),
        "false_negative": int(fn),
        "total": int(total),
    }


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--model", required=True, help="Путь к ResNet ONNX модели")
    parser.add_argument("--data-dir", required=True, help="Папка с crack/ok")
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--img-size", type=int, default=224)
    parser.add_argument("--classes", default="crack,ok")
    parser.add_argument("--strict-threshold", type=float, default=0.65)
    parser.add_argument("--balanced-threshold", type=float, default=0.465)
    parser.add_argument("--sensitive-threshold", type=float, default=0.35)
    parser.add_argument("--default-mode", default="balanced")

    args = parser.parse_args()

    model_path = Path(args.model)
    data_dir = Path(args.data_dir)

    if not model_path.exists():
        raise FileNotFoundError(f"ONNX модель не найдена: {model_path}")

    if not data_dir.exists():
        raise FileNotFoundError(f"Папка датасета не найдена: {data_dir}")

    fallback_classes = [item.strip() for item in args.classes.split(",") if item.strip()]
    meta = load_meta(model_path, fallback_classes, args.img_size)

    classes = meta.get("classes") or fallback_classes
    img_size = int(meta.get("img_size") or args.img_size)

    if "crack" not in classes or "ok" not in classes:
        raise RuntimeError(f"Ожидались классы crack/ok, получено: {classes}")

    crack_idx = classes.index("crack")

    session_options = ort.SessionOptions()
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_options.intra_op_num_threads = 4
    session_options.inter_op_num_threads = 1

    session = ort.InferenceSession(
        str(model_path),
        sess_options=session_options,
        providers=["CPUExecutionProvider"],
    )

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    tf = transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )

    items = list_images(data_dir)

    y_true = []
    p_crack_values = []

    for start in range(0, len(items), args.batch):
        batch_items = items[start : start + args.batch]

        tensors = []

        for image_path, label in batch_items:
            with Image.open(image_path) as img:
                pil_img = img.convert("RGB")

            tensors.append(tf(pil_img))
            y_true.append(label)

        batch_tensor = torch.stack(tensors, dim=0)
        batch_np = batch_tensor.detach().cpu().numpy().astype(np.float32)

        logits = session.run([output_name], {input_name: batch_np})[0]
        probs = softmax(logits)

        p_crack_values.extend([float(v) for v in probs[:, crack_idx]])

    thresholds = {
        "strict": args.strict_threshold,
        "balanced": args.balanced_threshold,
        "sensitive": args.sensitive_threshold,
    }

    by_mode = {
        mode_name: calc_metrics(y_true, p_crack_values, threshold)
        for mode_name, threshold in thresholds.items()
    }

    default_mode = args.default_mode
    default_metrics = by_mode.get(default_mode) or by_mode["balanced"]

    output = {
        "task": "classification",
        "runtime": "onnxruntime",
        "weights_path": str(model_path).replace("\\", "/"),
        "dataset_dir": str(data_dir).replace("\\", "/"),
        "samples_total": len(items),
        "classes": classes,
        "img_size": img_size,
        "default_mode": default_mode,
        "by_mode": by_mode,
        **default_metrics,
    }

    print("\n=== METRICS_JSON_START ===")
    print(json.dumps(output, ensure_ascii=False, indent=2))
    print("=== METRICS_JSON_END ===")


if __name__ == "__main__":
    main()