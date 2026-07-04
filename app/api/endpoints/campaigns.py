from fastapi import APIRouter

from app.repositories.content_repo import create_event, delete_row, insert_row, list_rows_filtered, update_row
from app.schemas.campaigns import CampaignCreate, CampaignUpdate
from app.schemas.responses import DeleteResponse, EntityResponse

router = APIRouter()


@router.get("")
def list_campaigns(topic_id: str | None = None, q: str | None = None, limit: int = 50, offset: int = 0):
    filters = {"topic_id": topic_id} if topic_id else None
    search = ("title", q) if q else None
    return list_rows_filtered("content_campaigns", filters=filters, order="-created_at", search=search, limit=limit, offset=offset)


@router.post("/topics/{topic_id}", response_model=EntityResponse)
def create_campaign(topic_id: str, payload: CampaignCreate):
    data = payload.model_dump()
    row = insert_row("content_campaigns", {**data, "topic_id": topic_id})
    create_event("info", "campaign_created", "Campaign created", {"title": payload.title}, topic_id=topic_id, campaign_id=row["id"])
    return {"id": row["id"]}


@router.patch("/{campaign_id}", response_model=EntityResponse)
def update_campaign(campaign_id: str, payload: CampaignUpdate):
    row = update_row("content_campaigns", campaign_id, payload.model_dump(exclude_none=True))
    create_event("info", "campaign_updated", "Campaign updated", payload.model_dump(exclude_none=True), campaign_id=campaign_id)
    return {"id": row["id"]}


@router.post("/{campaign_id}/run", response_model=EntityResponse)
def run_campaign(campaign_id: str):
    row = insert_row(
        "queue_jobs",
        {
            "job_type": "run_campaign",
            "campaign_id": campaign_id,
            "status": "pending",
            "priority": 100,
            "payload": {"campaign_id": campaign_id},
        },
    )
    create_event("info", "campaign_queued", "Campaign queued for run", {"job_id": row["id"]}, campaign_id=campaign_id)
    return {"id": row["id"]}


@router.delete("/{campaign_id}", response_model=DeleteResponse)
def delete_campaign(campaign_id: str):
    delete_row("content_campaigns", campaign_id)
    return {"ok": True}
