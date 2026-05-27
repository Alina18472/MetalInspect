import argparse
import csv
import json
import os
import statistics
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode

import requests


DEFAULT_FIELDS = [
    "target_camera_fps",
    "camera_fps",
    "analysis_fps",
    "analysis_to_camera_ratio",
    "camera_to_target_ratio",
    "fps_gap_camera_vs_analysis",
    "queue_size",
    "preprocess_queue_frames",
    "analysis_queue_frames",
    "buffered_frames_count",
    "dropped_frames",
    "processed_frames",
    "camera_frames_sent",
    "processed_ingots",
    "total_crack",
    "total_ok",
    "last_batch_inference_time_ms",
    "avg_task_total_time_ms",
    "last_task_total_time_ms",
    "last_model_analysis_time_ms",
    "last_image_load_time_ms",
    "last_preprocess_time_ms",
    "avg_preprocess_time_ms",
    "last_db_save_time_ms",
    "last_storage_upload_time_ms",
]


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def request_json(method, base_url, path, token=None, params=None, ignore_errors=False):
    url = base_url.rstrip("/") + path

    if params:
        url += "?" + urlencode(params)

    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.request(method, url, headers=headers, timeout=20)
    except Exception as e:
        if ignore_errors:
            return None
        raise RuntimeError(f"{method} {url} failed: {e}") from e

    if response.status_code >= 400:
        if ignore_errors:
            return None

        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(
            f"{method} {url} returned {response.status_code}: {detail}"
        )

    if not response.text:
        return None

    try:
        return response.json()
    except Exception:
        return response.text


def get_models(base_url, token):
    return request_json("GET", base_url, "/ai/models", token=token)


def find_model(models, model_key):
    for model in models:
        if model.get("model_key") == model_key:
            return model

    available = "\n".join(
        f"- {m.get('model_key')} | id={m.get('id')} | {m.get('name')}"
        for m in models
    )

    raise RuntimeError(
        f"Модель с model_key='{model_key}' не найдена.\n"
        f"Доступные модели:\n{available}"
    )


def stop_shift_and_camera(base_url, token):
    request_json("POST", base_url, "/ai/shift/stop", token=token, ignore_errors=True)
    time.sleep(0.5)
    request_json("POST", base_url, "/ai/camera/stop", token=token, ignore_errors=True)
    time.sleep(0.5)


def activate_model(base_url, token, model_id):
    return request_json(
        "POST",
        base_url,
        f"/ai/models/{model_id}/activate",
        token=token,
    )


def start_camera(base_url, token, fps):
    delay_sec = 1.0 / float(fps)

    return request_json(
        "POST",
        base_url,
        "/ai/camera/start",
        token=token,
        params={"delay_sec": delay_sec},
    )


def start_shift(base_url, token, mode, shift_delay_sec=0.0):
    params = {
        "delay_sec": float(shift_delay_sec),
    }

    if mode:
        params["mode"] = mode

    return request_json(
        "POST",
        base_url,
        "/ai/shift/start",
        token=token,
        params=params,
    )

def get_snapshot(base_url, token):
    return request_json("GET", base_url, "/ai/runtime/snapshot", token=token)


def extract_summary(snapshot):
    if not isinstance(snapshot, dict):
        return {}

    summary = snapshot.get("summary") or {}

    shift_status = snapshot.get("shift_status") or {}
    camera_status = snapshot.get("camera_status") or {}

    result = {}

    for source in [summary, shift_status, camera_status]:
        if isinstance(source, dict):
            result.update(source)

    return result


def get_number(data, key):
    value = data.get(key)

    if value is None or value == "":
        return None

    try:
        return float(value)
    except Exception:
        return None


def median_of(samples, key):
    values = [
        get_number(sample, key)
        for sample in samples
        if get_number(sample, key) is not None
    ]

    if not values:
        return None

    return statistics.median(values)


def last_of(samples, key):
    if not samples:
        return None

    value = get_number(samples[-1], key)
    return value


def queue_value(sample):
    for key in ["queue_size", "analysis_queue_frames", "preprocess_queue_frames"]:
        value = get_number(sample, key)
        if value is not None:
            return value

    return 0.0


def summarize_run(model_key, mode, target_fps, samples, stable_samples, min_ratio, max_queue_growth):
    first_stable_queue = queue_value(stable_samples[0]) if stable_samples else None
    last_stable_queue = queue_value(stable_samples[-1]) if stable_samples else None

    if first_stable_queue is not None and last_stable_queue is not None:
        queue_growth = last_stable_queue - first_stable_queue
    else:
        queue_growth = None

    median_analysis_ratio = median_of(stable_samples, "analysis_to_camera_ratio")
    median_camera_fps = median_of(stable_samples, "camera_fps")
    median_analysis_fps = median_of(stable_samples, "analysis_fps")

    stable = (
        median_analysis_ratio is not None
        and median_analysis_ratio >= min_ratio
        and queue_growth is not None
        and queue_growth <= max_queue_growth
    )

    row = {
        "model_key": model_key,
        "mode": mode,
        "target_fps": target_fps,
        "stable": stable,
        "stable_reason": (
            "OK"
            if stable
            else f"ratio={median_analysis_ratio}, queue_growth={queue_growth}"
        ),
        "samples_total": len(samples),
        "stable_samples_total": len(stable_samples),
        "median_camera_fps": median_camera_fps,
        "median_analysis_fps": median_analysis_fps,
        "median_analysis_to_camera_ratio": median_analysis_ratio,
        "queue_growth": queue_growth,
    }

    for field in DEFAULT_FIELDS:
        row[f"last_{field}"] = last_of(stable_samples or samples, field)
        row[f"median_{field}"] = median_of(stable_samples or samples, field)

    return row


def benchmark_one_fps(
    base_url,
    token,
    model_key,
    model_id,
    mode,
    fps,
    duration_sec,
    warmup_sec,
    sample_interval_sec,
    min_ratio,
    max_queue_growth,
    shift_delay_sec,
):
    print(f"\n=== {model_key} | mode={mode} | target_fps={fps} ===")

    stop_shift_and_camera(base_url, token)

    print("Activating model...")
    activate_model(base_url, token, model_id)

    print("Starting camera...")
    start_camera(base_url, token, fps)

    time.sleep(1.0)

    print("Starting shift...")
    start_shift(base_url, token, mode, shift_delay_sec=shift_delay_sec)

    started_at = time.time()
    samples = []
    stable_samples = []

    try:
        while True:
            elapsed = time.time() - started_at

            snapshot = get_snapshot(base_url, token)
            summary = extract_summary(snapshot)

            summary["_elapsed_sec"] = round(elapsed, 2)
            summary["_collected_at"] = now_iso()

            samples.append(summary)

            if elapsed >= warmup_sec:
                stable_samples.append(summary)

            camera_fps = get_number(summary, "camera_fps")
            analysis_fps = get_number(summary, "analysis_fps")
            ratio = get_number(summary, "analysis_to_camera_ratio")
            q = queue_value(summary)

            print(
                f"t={elapsed:5.1f}s | "
                f"camera_fps={camera_fps} | "
                f"analysis_fps={analysis_fps} | "
                f"ratio={ratio} | "
                f"queue={q}"
            )

            if elapsed >= duration_sec:
                break

            time.sleep(sample_interval_sec)

    finally:
        print("Stopping shift/camera...")
        stop_shift_and_camera(base_url, token)

    return summarize_run(
        model_key=model_key,
        mode=mode,
        target_fps=fps,
        samples=samples,
        stable_samples=stable_samples,
        min_ratio=min_ratio,
        max_queue_growth=max_queue_growth,
    ), samples


def write_csv(path, rows):
    if not rows:
        return

    fieldnames = sorted(set().union(*(row.keys() for row in rows)))

    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--token", default=os.getenv("ACCESS_TOKEN"))
    parser.add_argument("--model-key", required=True)
    parser.add_argument("--mode", default=None)
    parser.add_argument("--fps", nargs="+", type=float, required=True)

    parser.add_argument("--duration", type=int, default=60)
    parser.add_argument("--warmup", type=int, default=15)
    parser.add_argument("--sample-interval", type=float, default=5.0)

    parser.add_argument("--min-ratio", type=float, default=0.95)
    parser.add_argument("--max-queue-growth", type=float, default=10.0)

    parser.add_argument("--out-dir", default="runtime_benchmarks")
    parser.add_argument("--shift-delay", type=float, default=0.0)
    parser.add_argument("--cooldown", type=float, default=10.0)

    args = parser.parse_args()

    if not args.token:
        raise RuntimeError(
            "Не передан token. Передай --token ... или задай $env:ACCESS_TOKEN."
        )

    base_url = args.base_url.rstrip("/")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    models = get_models(base_url, args.token)
    model = find_model(models, args.model_key)

    model_id = model["id"]
    mode = args.mode or model.get("default_mode") or "balanced"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    all_rows = []
    raw_runs = {}

    for index, fps in enumerate(args.fps):
        row, samples = benchmark_one_fps(
            base_url=base_url,
            token=args.token,
            model_key=args.model_key,
            model_id=model_id,
            mode=mode,
            fps=fps,
            duration_sec=args.duration,
            warmup_sec=args.warmup,
            sample_interval_sec=args.sample_interval,
            min_ratio=args.min_ratio,
            max_queue_growth=args.max_queue_growth,
            shift_delay_sec=args.shift_delay,
        )

        all_rows.append(row)
        raw_runs[str(fps)] = samples

        if args.cooldown > 0 and index < len(args.fps) - 1:
            print(f"\nCooldown {args.cooldown}s...")
            time.sleep(args.cooldown)

    summary_path = out_dir / f"{args.model_key}_{mode}_{timestamp}_summary.csv"
    raw_path = out_dir / f"{args.model_key}_{mode}_{timestamp}_raw.json"

    write_csv(summary_path, all_rows)

    raw_path.write_text(
        json.dumps(
            {
                "model_key": args.model_key,
                "mode": mode,
                "created_at": now_iso(),
                "rows": all_rows,
                "raw_runs": raw_runs,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\n=== SUMMARY ===")
    print(json.dumps(all_rows, ensure_ascii=False, indent=2))

    stable_rows = [row for row in all_rows if row["stable"]]

    if stable_rows:
        best = max(stable_rows, key=lambda row: float(row["target_fps"]))
        print(
            "\nRecommended stable FPS:",
            best["target_fps"],
            "| model:",
            args.model_key,
            "| mode:",
            mode,
        )
    else:
        print("\nStable FPS was not found with current criteria.")

    print(f"\nSaved summary: {summary_path}")
    print(f"Saved raw samples: {raw_path}")


if __name__ == "__main__":
    main()