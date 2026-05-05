from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.services.shift_runtime_service import shift_runtime_service
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import ai_service, MODE_PRESETS

from app.services.shift_service import process_stream_folder, DEFAULT_STREAM_DIR
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.shift_service import save_stream_results_to_db
from app.services.camera_runtime_service import camera_runtime_service
router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/model-info")
def get_model_info(current_user: User = Depends(get_current_user)):
    try:
        return ai_service.get_model_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_image(
    file: UploadFile = File(...),
    mode: str = Form("balanced"),
    threshold: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
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
    
# @router.post("/process-stream")
# def process_stream(
#     mode: str = "balanced",
#     threshold: Optional[float] = None,
#     current_user: User = Depends(get_current_user),
# ):
#     try:
#         return process_stream_folder(
#             stream_dir=DEFAULT_STREAM_DIR,
#             mode=mode,
#             threshold=threshold,
#             save_best_frames=True,
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-stream")
def process_stream(
    mode: str = "balanced",
    threshold: Optional[float] = None,
    save_to_db: bool = True,
    include_frames: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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

@router.post("/shift/start")
def start_shift(
    mode: str = "balanced",
    threshold: Optional[float] = None,
    delay_sec: float = 0.7,
    current_user: User = Depends(get_current_user),
):
    try:
        return shift_runtime_service.start_shift(
            user_id=current_user.id,
            mode=mode,
            threshold=threshold,
            delay_sec=delay_sec,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shift/status")
def get_shift_status(
    current_user: User = Depends(get_current_user),
):
    return shift_runtime_service.get_status()


@router.post("/shift/stop")
def stop_shift(
    current_user: User = Depends(get_current_user),
):
    return shift_runtime_service.stop_shift()

@router.post("/camera/start")
def start_camera(
    delay_sec: float = 0.25,
    current_user: User = Depends(get_current_user),
):
    try:
        return camera_runtime_service.start_camera(delay_sec=delay_sec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/camera/status")
def get_camera_status(
    current_user: User = Depends(get_current_user),
):
    return camera_runtime_service.get_status()


@router.post("/camera/stop")
def stop_camera(
    current_user: User = Depends(get_current_user),
):
    return camera_runtime_service.stop_camera()