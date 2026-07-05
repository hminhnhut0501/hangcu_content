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


@router.get("/{campaign_id}/preflight")
def campaign_preflight(campaign_id: str):
    campaign = get_row("content_campaigns", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign_not_found")
    topic = get_row("content_topics", str(campaign.get("topic_id") or ""))
    project = get_row("content_groups", str(campaign.get("group_id") or ""))
    pool = get_account_pool_report()
    issues: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    if not str(campaign.get("source_start_link") or "").strip():
        issues.append({"code": "missing_source", "message": "Campaign chưa có source_start_link."})
    if not str(campaign.get("target_link") or "").strip():
        issues.append({"code": "missing_target", "message": "Campaign chưa có target_link."})
    if not topic:
        issues.append({"code": "topic_not_found", "message": "Topic đích của campaign không tồn tại."})
    if not project:
        warnings.append({"code": "project_not_found", "message": "Project của campaign không load được từ backend."})
    if int(pool.get("eligible") or 0) <= 0:
        issues.append({"code": "no_account", "message": "No eligible Telegram account available."})
    elif int(pool.get("eligible") or 0) < 2:
        warnings.append({"code": "few_accounts", "message": "Chỉ có 1 account đủ điều kiện, drip có thể kẹt nếu account đó bị pause."})
    if int(campaign.get("batch_size") or 0) <= 0:
        warnings.append({"code": "batch_size", "message": "batch_size chưa hợp lệ, sẽ được hiểu là 1."})
    if int(campaign.get("delay_min") or 0) > int(campaign.get("delay_max") or 0):
        warnings.append({"code": "delay_range", "message": "delay_min lớn hơn delay_max."})
    return {
        "ok": len(issues) == 0,
        "campaign_id": campaign_id,
        "campaign": {
            "id": campaign.get("id"),
            "title": campaign.get("title"),
            "status": campaign.get("status"),
            "enabled": campaign.get("enabled"),
            "run_mode": "drip",
            "source_start_link": campaign.get("source_start_link"),
            "source_end_link": campaign.get("source_end_link"),
            "target_link": campaign.get("target_link"),
            "batch_size": campaign.get("batch_size") or 1,
            "delay_min": campaign.get("delay_min") or 1,
            "delay_max": campaign.get("delay_max") or 7,
            "follow_latest": bool(campaign.get("follow_latest", True)),
            "last_msg_id": int(campaign.get("last_msg_id") or 0),
            "next_send_at": campaign.get("next_send_at"),
            "topic": {
                "id": topic.get("id") if topic else None,
                "name": topic.get("name") if topic else None,
                "target_link_seed": topic.get("target_link_seed") if topic else None,
            },
            "project": {
                "id": project.get("id") if project else None,
                "name": project.get("name") if project else None,
            },
            "account_pool": {
                "eligible": int(pool.get("eligible") or 0),
                "total": int(pool.get("total") or 0),
                "reasons": pool.get("reasons") or {},
            },
        },
        "issues": issues,
        "warnings": warnings,
        "checks": [
            {"key": "source_link", "label": "Source link", "ok": bool(str(campaign.get("source_start_link") or "").strip())},
            {"key": "target_link", "label": "Target link", "ok": bool(str(campaign.get("target_link") or "").strip())},
            {"key": "topic", "label": "Topic đích", "ok": bool(topic)},
            {"key": "account", "label": "Eligible account", "ok": int(pool.get("eligible") or 0) > 0},
        ],
    }


@router.get("/{campaign_id}/preview")
def campaign_preview(campaign_id: str):
    campaign = get_row("content_campaigns", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign_not_found")
    topic = get_row("content_topics", str(campaign.get("topic_id") or ""))
    project = get_row("content_groups", str(campaign.get("group_id") or ""))
    batch_size = int(campaign.get("batch_size") or 1)
    delay_min = int(campaign.get("delay_min") or 1)
    delay_max = int(campaign.get("delay_max") or 7)
    last_msg_id = int(campaign.get("last_msg_id") or 0)
    preview_items = []
    for index in range(1, min(batch_size, 5) + 1):
        target = campaign.get("target_link") or (topic.get("target_link_seed") if topic else "-")
        preview_items.append(
            {
                "step": index,
                "source": campaign.get("source_start_link") or "-",
                "target": target,
                "cursor": last_msg_id + index,
                "delay_window": {"min": delay_min, "max": delay_max},
                "caption_mode": "keep" if str(campaign.get("group_mode") or "keep") == "keep" else "replace",
            }
        )
    return {
        "ok": True,
        "campaign_id": campaign_id,
        "project": {
            "id": project.get("id") if project else None,
            "name": project.get("name") if project else None,
        },
        "topic": {
            "id": topic.get("id") if topic else None,
            "name": topic.get("name") if topic else None,
            "target_link_seed": topic.get("target_link_seed") if topic else None,
        },
        "run_mode": "drip",
        "cursor_last_msg_id": last_msg_id,
        "batch_size": batch_size,
        "delay_min": delay_min,
        "delay_max": delay_max,
        "preview": preview_items,
        "summary": {
            "source": campaign.get("source_start_link") or "-",
            "target": campaign.get("target_link") or (topic.get("target_link_seed") if topic else "-"),
            "next_cursor": last_msg_id + 1 if last_msg_id > 0 else 1,
            "project_name": project.get("name") if project else None,
            "topic_name": topic.get("name") if topic else None,
        },
    }


@router.post("/{campaign_id}/run", response_model=EntityResponse)
def run_campaign(campaign_id: str, mode: str = "full"):
    campaign = get_row("content_campaigns", campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="campaign_not_found")
    normalized_mode = str(mode or "").strip().lower()
    if normalized_mode in {"single", "one", "one_message", "1"}:
        run_mode = "single"
    elif normalized_mode in {"drip", "auto_drip"}:
        run_mode = "drip"
    else:
        run_mode = "full"
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
                "result": {"run_mode": run_mode},
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
                "payload": {
                    "campaign_id": campaign_id,
                    "campaign_run_id": run["id"],
                    "run_mode": run_mode,
                    "drip_mode": run_mode == "drip",
                    "cursor_last_msg_id": int(campaign.get("last_msg_id") or 0),
                },
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
    create_event(
        "info",
        "campaign_queued",
        "Campaign queued for run",
        {
            "job_id": row["id"],
            "run_id": run["id"],
            "pool": pool,
            "run_mode": run_mode,
            "cursor_last_msg_id": int(campaign.get("last_msg_id") or 0),
        },
        campaign_id=campaign_id,
    )
    return {"id": row["id"]}


@router.delete("/{campaign_id}", response_model=DeleteResponse)
def delete_campaign(campaign_id: str):
    delete_row("content_campaigns", campaign_id)
    return {"ok": True}
