import asyncio
from typing import Any

from fastapi import WebSocket


class ShiftWebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.loop = asyncio.get_running_loop()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_json(self, websocket: WebSocket, message: dict[str, Any]):
        await websocket.send_json(message)

    async def _broadcast_json(self, message: dict[str, Any]):
        disconnected = []

        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)

    def broadcast_json(self, message: dict[str, Any]):
        """
        Можно вызывать из обычного sync-кода и из отдельного thread.
        """
        if not self.loop or self.loop.is_closed():
            return

        asyncio.run_coroutine_threadsafe(
            self._broadcast_json(message),
            self.loop,
        )


shift_ws_manager = ShiftWebSocketManager()