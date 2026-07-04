from fastapi import APIRouter

from app.services.scheduler_service import enqueue_due_campaigns

router = APIRouter()


@router.post("/scheduler/tick")
def scheduler_tick():
    return {"enqueued": enqueue_due_campaigns()}

