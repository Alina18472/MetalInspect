from pathlib import Path
import json

import numpy as np
import onnxruntime as ort


BACKEND_DIR = Path(__file__).resolve().parents[1]

ONNX_PATH = BACKEND_DIR / "models_ml" / "resnet18_crack_ok.onnx"
META_PATH = BACKEND_DIR / "models_ml" / "resnet18_crack_ok.onnx.meta.json"


def softmax(x: np.ndarray, axis: int = 1) -> np.ndarray:
    x = x - np.max(x, axis=axis, keepdims=True)
    exp = np.exp(x)
    return exp / np.sum(exp, axis=axis, keepdims=True)


def main():
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    img_size = int(meta["img_size"])
    classes = meta["classes"]

    session_options = ort.SessionOptions()
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session_options.intra_op_num_threads = 4
    session_options.inter_op_num_threads = 1

    session = ort.InferenceSession(
        str(ONNX_PATH),
        sess_options=session_options,
        providers=["CPUExecutionProvider"],
    )

    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    batch = np.random.randn(4, 3, img_size, img_size).astype(np.float32)

    logits = session.run([output_name], {input_name: batch})[0]
    probs = softmax(logits, axis=1)

    print("ONNX loaded successfully")
    print("providers:", session.get_providers())
    print("input:", input_name)
    print("output:", output_name)
    print("classes:", classes)
    print("batch shape:", batch.shape)
    print("logits shape:", logits.shape)
    print("probs shape:", probs.shape)
    print("first probs:", probs[0])


if __name__ == "__main__":
    main()