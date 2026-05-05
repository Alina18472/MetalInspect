from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi import HTTPException

from app.core.security import decode_token
from app.core.ws_manager import shift_ws_manager


router = APIRouter(tags=["websocket"])


@router.websocket("/ws/shift")
async def shift_websocket(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    # WebSocket не умеет нормально отправлять Authorization header из браузера,
    # поэтому токен передаём через query-параметр: /ws/shift?token=...
    if not token:
        await websocket.close(code=1008)
        return

    try:
        decode_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return
    except Exception:
        await websocket.close(code=1008)
        return

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
            # Просто держим соединение открытым.
            await websocket.receive_text()

    except WebSocketDisconnect:
        shift_ws_manager.disconnect(websocket)

    except Exception:
        shift_ws_manager.disconnect(websocket)