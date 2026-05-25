from datetime import datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.mes_event import MesEvent
from app.schemas.mes import MesDefectPayload


class MockMesService:
    def send_defect(self, db: Session, payload: MesDefectPayload) -> dict:
        """
        Имитация отправки дефекта во внешнюю MES.

        В реальной системе здесь был бы HTTP-запрос, Kafka-сообщение
        или другой интеграционный механизм. В дипломном прототипе
        мы сохраняем событие в таблицу mes_events и возвращаем ответ.
        """

        mes_event_id = f"MES-{uuid4().hex[:10].upper()}"

        response_message = (
            f"Mock-MES accepted defect #{payload.defect_id} "
            f"for ingot {payload.ingot_id or 'unknown'}"
        )

        event = MesEvent(
            defect_id=payload.defect_id,
            inspection_id=payload.inspection_id,
            ingot_id=payload.ingot_id,
            external_event_id=mes_event_id,
            payload=payload.model_dump(),
            status="accepted",
            response_message=response_message,
            processed_at=datetime.utcnow(),
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        return {
            "success": True,
            "mes_event_id": mes_event_id,
            "mes_status": event.status,
            "message": response_message,
            "payload": payload.model_dump(),
        }


mock_mes_service = MockMesService()