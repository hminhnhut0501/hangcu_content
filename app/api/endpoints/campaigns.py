from fastapi import APIRouter, HTTPException

from app.repositories.content_repo import create_event, delete_row, get_row, insert_row, list_rows_filtered, now_iso, update_row, get_account_pool_report
from app.schemas.campaigns import CampaignCreate, CampaignUpdate
from app.schemas.responses import DeleteResponse, EntityResponse
from app.services.scheduler_service import schedule_fields

router = APIRouter()


@router.get("")
def list_campaigns(topic_id: str | None = None, q: str | None = None, limit: int = 50, offset: int = 0):
    filters = {"topic_id": topic_id} if topic_id else None
    search = ("title", q) if q else None
    return list_rows_filtered("content_campaigns", filters=filters, order="-created_at", search=search, limit=limit, offset=offset)


@router.post("/topics/{topic_id}", response_model=EntityResponse)
def create_campaign(topic_id: str, payload: CampaignCreate):
    data = payload.model_dump()
    topic = get_row("content_topics", topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="topic_not_found")
    schedule = schedule_fields(bool(data.pop("schedule_enabled", False)), str(data.pop("schedule_slots", "") or ""))
    target_link = str(data.get("target_link") or "").strip() or str(topic.get("target_link_seed") or "").strip()
    if not target_link:
        raise HTTPException(status_code=400, detail="topic_missing_target_link_seed")
    data["target_link"] = target_link
    row = insert_row("content_campaigns", {**data, **schedule, "topic_id": topic_id, "group_id": topic["group_id"]})
    create_event("info", "campaign_created", "Campaign created", {"title": payload.title}, topic_id=topic_id, campaign_id=row["id"])
    return {"id": row["id"]}


@router.patch("/{campaign_id}", response_model=EntityResponse)
def update_campaign(campaign_id: str, payload: CampaignUpdate):
    data = payload.model_dump(exclude_none=True)
    if "schedule_enabled" in data or "schedule_slots" in data:
        current = get_row("content_campaigns", campaign_id) or {}
        schedule_enabled = bool(data.pop("schedule_enabled", current.get("schedule_enabled", False)))
        schedule_slots = str(data.pop("schedule_slots", current.get("schedule_slots", "")) or "")
        data.update(schedule_fields(schedule_enabled, schedule_slots))
    row = update_row("content_campaigns", campaign_id, data)
    create_event("info", "campaign_updated", "Campaign updated", data, campaign_id=campaign_id)
    return {"id": row["id"]}


@router.post("/{campaign_id}/run", response_model=EntityResponse)
def run_campaign(campaign_id: str):
    campaign = get_row("content_campaigns", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign_not_found")
    pool = get_account_pool_report()
    if int(pool.get("eligible") or 0) <= 0:
        detail = f"no_eligible_telegram_account: {pool.get('reasons') or {}}"
        create_event(
            "error",
            "campaign_run_blocked_no_account",
            "Campaign run blocked: no eligible Telegram account",
            {"campaign_id": campaign_id, "pool": pool},
            campaign_id=campaign_id,
        )
        raise HTTPException(status_code=503, detail=detail)
    try:
        run = insert_row(
            "campaign_runs",
            {
                "campaign_id": campaign_id,
                "slot_key": f"manual:{now_iso()}",
                "scheduled_at": now_iso(),
                "status": "queued",
                "queued_items": 1,
                "selected_topic_ids": [campaign.get("topic_id")],
            },
            raise_error=True,
        )
    except Exception as exc:
        detail = f"campaign_run_insert_failed: {exc}"
        create_event(
            "error",
            "campaign_run_insert_failed",
            "Campaign run insert failed",
            {"campaign_id": campaign_id, "error": str(exc)},
            campaign_id=campaign_id,
        )
        raise HTTPException(status_code=503, detail=detail) from exc
    if not run or not run.get("id"):
        create_event(
            "error",
            "campaign_run_insert_failed",
            "Campaign run insert failed",
            {"campaign_id": campaign_id, "error": "no_row_returned"},
            campaign_id=campaign_id,
        )
        raise HTTPException(status_code=503, detail="campaign_run_insert_failed")
    try:
        row = insert_row(
            "queue_jobs",
            {
                "job_type": "run_campaign",
                "campaign_id": campaign_id,
                "group_id": campaign.get("group_id"),
                "topic_id": campaign.get("topic_id"),
                "status": "pending",
                "priority": 100,
                "payload": {"campaign_id": campaign_id, "campaign_run_id": run["id"]},
            },
            raise_error=True,
        )
    except Exception as exc:
        detail = f"queue_job_insert_failed: {exc}"
        create_event(
            "error",
            "queue_job_insert_failed",
            "Queue job insert failed",
            {"campaign_id": campaign_id, "campaign_run_id": run["id"], "error": str(exc)},
            campaign_id=campaign_id,
        )
        raise HTTPException(status_code=503, detail=detail) from exc
    if not row or not row.get("id"):
        create_event(
            "error",
            "queue_job_insert_failed",
            "Queue job insert failed",
            {"campaign_id": campaign_id, "campaign_run_id": run["id"], "error": "no_row_returned"},
            campaign_id=campaign_id,
        )
        raise HTTPException(status_code=503, detail="queue_job_insert_failed")
    update_row("content_campaigns", campaign_id, {"status": "queued", "last_run_at": now_iso()})
    create_event("info", "campaign_queued", "Campaign queued for run", {"job_id": row["id"], "run_id": run["id"], "pool": pool}, campaign_id=campaign_id)
    return {"id": row["id"]}


@router.delete("/{campaign_id}", response_model=DeleteResponse)
def delete_campaign(campaign_id: str):
    delete_row("content_campaigns", campaign_id)
    return {"ok": True}
