from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_permission
from app.models.user import User
from app.models.mes_event import MesEvent
from app.schemas.mes import MesDefectPayload
from app.services.mes_service import mock_mes_service

router = APIRouter(prefix="/mock-mes", tags=["mock-mes"])


@router.post("/defects")
def receive_defect_event(
    payload: MesDefectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("defects.review")),
):
    """
    Endpoint mock-MES, который принимает событие о дефекте
    и возвращает ответ как внешняя производственная система.
    """
    return mock_mes_service.send_defect(db=db, payload=payload)


@router.get("/events")
def get_mes_events(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("journal.view")),
):
    events = (
        db.query(MesEvent)
        .order_by(MesEvent.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "total": len(events),
        "items": [
            {
                "id": event.id,
                "defect_id": event.defect_id,
                "inspection_id": event.inspection_id,
                "ingot_id": event.ingot_id,
                "external_event_id": event.external_event_id,
                "status": event.status,
                "response_message": event.response_message,
                "payload": event.payload,
                "created_at": event.created_at.isoformat(timespec="seconds")
                if event.created_at
                else None,
                "processed_at": event.processed_at.isoformat(timespec="seconds")
                if event.processed_at
                else None,
            }
            for event in events
        ],
    }


@router.get("/events/{event_id}")
def get_mes_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("journal.view")),
):
    event = db.query(MesEvent).filter(MesEvent.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="MES event not found")

    return {
        "id": event.id,
        "defect_id": event.defect_id,
        "inspection_id": event.inspection_id,
        "ingot_id": event.ingot_id,
        "external_event_id": event.external_event_id,
        "status": event.status,
        "response_message": event.response_message,
        "payload": event.payload,
        "created_at": event.created_at.isoformat(timespec="seconds")
        if event.created_at
        else None,
        "processed_at": event.processed_at.isoformat(timespec="seconds")
        if event.processed_at
        else None,
    }