# ai.py
from typing import Optional

from fastapi import Query
import time
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.services.shift_runtime_service import shift_runtime_service
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import ai_service, MODE_PRESETS
from app.core.security import  require_permission
from app.services.shift_service import process_stream_folder, DEFAULT_STREAM_DIR
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.shift_service import save_stream_results_to_db
from app.services.camera_runtime_service import camera_runtime_service
router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/model-info")
def get_model_info(
    current_user: User = Depends(require_permission("dashboard.view")),
):
    try:
        return ai_service.get_model_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_image(
    file: UploadFile = File(...),
    mode: str = Form("balanced"),
    threshold: Optional[float] = Form(None),
    current_user: User = Depends(require_permission("shift.control")),
):
    if mode not in MODE_PRESETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown mode '{mode}'. Available modes: {list(MODE_PRESETS.keys())}",
        )

    try:
        image_bytes = await file.read()
        result = ai_service.predict_bytes(
            image_bytes=image_bytes,
            threshold=threshold,
            mode=mode,
        )

        return {
            "filename": file.filename,
            **result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@router.post("/process-stream")
def process_stream(
    mode: str = "balanced",
    threshold: Optional[float] = None,
    save_to_db: bool = True,
    include_frames: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("shift.control")),
):
    try:
        payload = process_stream_folder(
            stream_dir=DEFAULT_STREAM_DIR,
            mode=mode,
            threshold=threshold,
            save_best_frames=True,
        )

        db_result = None
        if save_to_db:
            db_result = save_stream_results_to_db(
                db=db,
                results_payload=payload,
                user_id=current_user.id,
            )

        if not include_frames:
            for item in payload["results"]:
                item.pop("frames", None)

        return {
            **payload,
            "db": db_result,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# @router.post("/shift/start")
# def start_shift(
#     mode: Optional[str] = Query(default=None),
#     threshold: Optional[float] = Query(default=None),
#     delay_sec: float = Query(default=0.7),
#     current_user: User = Depends(require_permission("shift.control")),
# ):
#     return shift_runtime_service.start_shift(
#         user_id=current_user.id,
#         mode=mode,
#         threshold=threshold,
#         delay_sec=delay_sec,
#     )

@router.get("/shift/status")
def get_shift_status(
    current_user: User = Depends(require_permission("dashboard.view")),
):
    return shift_runtime_service.get_status()

@router.post("/shift/stop")
def stop_shift(
    current_user: User = Depends(require_permission("shift.control")),
):
    return shift_runtime_service.stop_shift()

# @router.post("/camera/start")
# def start_camera(
#     delay_sec: float = 0.25,
#     current_user: User = Depends(require_permission("camera.control")),
# ):
#     try:
#         return camera_runtime_service.start_camera(delay_sec=delay_sec)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


@router.get("/camera/status")
def get_camera_status(
    current_user: User = Depends(require_permission("dashboard.view")),
):
    return camera_runtime_service.get_status()

@router.post("/camera/stop")
def stop_camera(
    current_user: User = Depends(require_permission("camera.control")),
):
    return camera_runtime_service.stop_camera()

# @router.post("/shift/start")
# def start_shift(
#     mode: Optional[str] = Query(default=None),
#     threshold: Optional[float] = Query(default=None),
#     delay_sec: float = Query(default=0.0, ge=0.0),
#     current_user: User = Depends(require_permission("shift.control")),
# ):
#     return shift_runtime_service.start_shift(
#         user_id=current_user.id,
#         mode=mode,
#         threshold=threshold,
#         delay_sec=delay_sec,
#     )


# @router.post("/camera/start")
# def start_camera(
#     delay_sec: float = Query(default=1 / 15, gt=0.0),
#     current_user: User = Depends(require_permission("camera.control")),
# ):
#     try:
#         return camera_runtime_service.start_camera(delay_sec=delay_sec)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/shift/start")
def start_shift(
    mode: Optional[str] = Query(default=None),
    threshold: Optional[float] = Query(default=None),
    delay_sec: float = Query(default=0.0, ge=0.0),
    analysis_debug: bool = Query(default=False),
    current_user: User = Depends(require_permission("shift.control")),
):
    return shift_runtime_service.start_shift(
        user_id=current_user.id,
        mode=mode,
        threshold=threshold,
        delay_sec=delay_sec,
        analysis_debug=analysis_debug,
    )


@router.post("/camera/start")
def start_camera(
    delay_sec: float = Query(default=1 / 15, gt=0.0),
    current_user: User = Depends(require_permission("camera.control")),
):
    try:
        return camera_runtime_service.start_camera(delay_sec=delay_sec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/runtime/snapshot")
def get_runtime_snapshot(
    current_user: User = Depends(require_permission("dashboard.view")),
):
    snapshot_started = time.perf_counter()
    collected_at = datetime.utcnow().isoformat(timespec="milliseconds") + "Z"

    shift_status = shift_runtime_service.get_status()
    camera_status = camera_runtime_service.get_status()

    collection_duration_ms = (time.perf_counter() - snapshot_started) * 1000.0

    camera_fps = float(camera_status.get("camera_fps") or 0.0)
    target_camera_fps = float(camera_status.get("target_camera_fps") or 0.0)
    analysis_fps = float(shift_status.get("analysis_fps") or 0.0)

    queue_size = int(shift_status.get("queue_size") or 0)
    analysis_queue_frames = int(shift_status.get("analysis_queue_frames") or 0)
    buffered_frames_count = int(shift_status.get("buffered_frames_count") or 0)

    processed_frames = int(
        shift_status.get("processed_frames_total")
        or shift_status.get("processed_frames")
        or 0
    )

    camera_frames_sent = int(camera_status.get("camera_frames_sent") or 0)

    fps_gap_camera_vs_analysis = camera_fps - analysis_fps

    if camera_fps > 0:
        analysis_to_camera_ratio = analysis_fps / camera_fps
    else:
        analysis_to_camera_ratio = None

    if target_camera_fps > 0:
        camera_to_target_ratio = camera_fps / target_camera_fps
    else:
        camera_to_target_ratio = None

    summary = {
        "camera_running": bool(camera_status.get("running")),
        "shift_running": bool(shift_status.get("running")),
        "analysis_running": bool(shift_status.get("analysis_running")),
        "shift_phase": shift_status.get("shift_phase"),

        "target_camera_fps": target_camera_fps,
        "camera_fps": camera_fps,
        "analysis_fps": analysis_fps,
        "fps_gap_camera_vs_analysis": round(fps_gap_camera_vs_analysis, 2),
        "analysis_to_camera_ratio": (
            round(analysis_to_camera_ratio, 3)
            if analysis_to_camera_ratio is not None
            else None
        ),
        "camera_to_target_ratio": (
            round(camera_to_target_ratio, 3)
            if camera_to_target_ratio is not None
            else None
        ),

        "camera_frames_sent": camera_frames_sent,
        "processed_frames": processed_frames,

        "queue_size": queue_size,
        "analysis_queue_frames": analysis_queue_frames,
        "buffered_frames_count": buffered_frames_count,
        "dropped_frames": int(shift_status.get("dropped_frames") or 0),

        "avg_analysis_time_ms": float(shift_status.get("avg_analysis_time_ms") or 0.0),
        "last_analysis_time_ms": float(shift_status.get("last_analysis_time_ms") or 0.0),

        "processed_ingots": int(shift_status.get("processed_ingots") or 0),
        "total_crack": int(shift_status.get("total_crack") or 0),
        "total_ok": int(shift_status.get("total_ok") or 0),
        "defect_rate": float(shift_status.get("defect_rate") or 0.0),

        "is_analysis_lagging": (
            bool(camera_status.get("running"))
            and bool(shift_status.get("running"))
            and analysis_fps > 0
            and camera_fps > analysis_fps
        ),
        "is_queue_growing_risk": queue_size > 0 and camera_fps > analysis_fps,
        "last_task_total_time_ms": float(shift_status.get("last_task_total_time_ms") or 0.0),
        "avg_task_total_time_ms": float(shift_status.get("avg_task_total_time_ms") or 0.0),
        "last_model_analysis_time_ms": float(shift_status.get("last_model_analysis_time_ms") or 0.0),
        "last_image_load_time_ms": float(shift_status.get("last_image_load_time_ms") or 0.0),
        "last_batch_inference_time_ms": float(shift_status.get("last_batch_inference_time_ms") or 0.0),
        "last_prediction_postprocess_time_ms": float(shift_status.get("last_prediction_postprocess_time_ms") or 0.0),
        "last_best_frame_save_time_ms": float(shift_status.get("last_best_frame_save_time_ms") or 0.0),
        "last_db_save_time_ms": float(shift_status.get("last_db_save_time_ms") or 0.0),
        "last_shift_stats_update_time_ms": float(shift_status.get("last_shift_stats_update_time_ms") or 0.0),
        "last_storage_upload_time_ms": float(shift_status.get("last_storage_upload_time_ms") or 0.0),
        "last_ws_publish_time_ms": float(shift_status.get("last_ws_publish_time_ms") or 0.0),
        
    }

    return {
        "type": "runtime_snapshot",
        "collected_at": collected_at,
        "collection_duration_ms": round(collection_duration_ms, 3),
        "summary": summary,
        "shift": shift_status,
        "camera": camera_status,
        
    }