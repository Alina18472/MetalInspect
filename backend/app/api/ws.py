from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi import HTTPException

from app.core.database import SessionLocal
from app.core.security import get_user_from_token, user_has_permission
from app.core.ws_manager import shift_ws_manager


router = APIRouter(tags=["websocket"])


@router.websocket("/ws/shift")
async def shift_websocket(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    if not token:
        await websocket.close(code=1008)
        return

    db = SessionLocal()

    try:
        user = get_user_from_token(db, token)

        if not user_has_permission(db, user, "dashboard.view"):
            await websocket.close(code=1008)
            return

    except HTTPException:
        await websocket.close(code=1008)
        return
    except Exception:
        await websocket.close(code=1008)
        return
    finally:
        db.close()

    await shift_ws_manager.connect(websocket)

    try:
        await shift_ws_manager.send_personal_json(
            websocket,
            {
                "type": "connected",
                "message": "WebSocket подключён",
            },
        )

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        shift_ws_manager.disconnect(websocket)

    except Exception:
        shift_ws_manager.disconnect(websocket)