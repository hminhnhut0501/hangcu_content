from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.repositories.content_repo import (
    create_event,
    insert_row,
    list_due_campaigns,
    now_iso,
    update_campaign,
)


def _parse_slots(raw: str) -> list[str]:
    slots = []
    for token in str(raw or "").split(","):
        token = token.strip()
        if not token:
            continue
        if len(token) == 5 and token[2] == ":":
            hh, mm = token.split(":")
            if hh.isdigit() and mm.isdigit():
                h, m = int(hh), int(mm)
                if 0 <= h <= 23 and 0 <= m <= 59:
                    slots.append(f"{h:02d}:{m:02d}")
    return sorted(set(slots))


def _next_slot(slots: list[str], base: datetime | None = None) -> str | None:
    if not slots:
        return None
    base = base or datetime.now(timezone.utc)
    candidates = []
    for slot in slots:
        h, m = [int(x) for x in slot.split(":")]
        dt = base.replace(hour=h, minute=m, second=0, microsecond=0)
        if dt <= base:
            dt = dt + timedelta(days=1)
        candidates.append(dt)
    return min(candidates).isoformat() if candidates else None


def enqueue_due_campaigns():
    due = list_due_campaigns()
    enqueued = []
    for campaign in due:
        slot_key = campaign.get("next_run_at") or now_iso()
        run_row = insert_row(
            "campaign_runs",
            {
                "campaign_id": campaign["id"],
                "slot_key": slot_key,
                "scheduled_at": campaign.get("next_run_at"),
                "status": "queued",
                "queued_items": 1,
                "selected_topic_ids": [],
            },
        )
        insert_row(
            "queue_jobs",
            {
                "job_type": "run_campaign",
                "campaign_id": campaign["id"],
                "status": "pending",
                "priority": 100,
                "payload": {"campaign_id": campaign["id"], "campaign_run_id": run_row["id"]},
            },
        )
        slots = _parse_slots(campaign.get("schedule_slots") or "")
        next_run_at = _next_slot(slots)
        update_campaign(campaign["id"], {"next_run_at": next_run_at, "last_run_at": now_iso()})
        create_event(
            "info",
            "campaign_scheduled",
            "Campaign scheduled",
            {"campaign_id": campaign["id"], "slot_key": slot_key, "next_run_at": next_run_at},
            campaign_id=campaign["id"],
        )
        enqueued.append(campaign["id"])
    return enqueued
