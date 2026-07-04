from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.repositories.content_repo import (
    create_event,
    insert_row,
    list_due_campaigns,
    list_auto_groups,
    list_group_campaigns,
    pick_account_for_job,
    now_iso,
    update_campaign,
    update_row,
)
from app.repositories.system_repo import upsert_setting


def parse_slots(raw: str) -> list[str]:
    slots = []
    for token in str(raw or "").replace(";", ",").replace("\n", ",").split(","):
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


def next_slot_at(slots: list[str], base: datetime | None = None, timezone_name: str | None = None) -> str | None:
    if not slots:
        return None
    try:
        local_tz = ZoneInfo(timezone_name or settings.app_timezone or "Asia/Ho_Chi_Minh")
    except Exception:
        local_tz = timezone.utc
    base = base or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    local_base = base.astimezone(local_tz)
    candidates = []
    for slot in slots:
        h, m = [int(x) for x in slot.split(":")]
        dt = local_base.replace(hour=h, minute=m, second=0, microsecond=0)
        if dt <= local_base:
            dt = dt + timedelta(days=1)
        candidates.append(dt.astimezone(timezone.utc))
    return min(candidates).isoformat() if candidates else None


def schedule_fields(schedule_enabled: bool, schedule_slots: str) -> dict:
    slots = parse_slots(schedule_slots)
    enabled = bool(schedule_enabled and slots)
    return {
        "schedule_enabled": enabled,
        "schedule_slots": ",".join(slots),
        "next_run_at": next_slot_at(slots) if enabled else None,
        "status": "scheduled" if enabled else "draft",
    }


def _group_strategy_pick(campaigns: list[dict], group: dict) -> list[dict]:
    if not campaigns:
        return []
    strategy = str(group.get("auto_strategy") or "round_robin").strip().lower()
    pick_count = max(1, int(group.get("auto_pick_count") or 1))
    ordered = list(campaigns)
    if strategy == "newest":
        ordered = sorted(ordered, key=lambda row: str(row.get("created_at") or ""), reverse=True)
    elif strategy == "oldest":
        ordered = sorted(ordered, key=lambda row: str(row.get("created_at") or ""))
    elif strategy == "least_recent":
        ordered = sorted(ordered, key=lambda row: str(row.get("last_run_at") or ""))
    elif strategy == "priority":
        ordered = sorted(ordered, key=lambda row: (str(row.get("status") or ""), str(row.get("last_run_at") or "")))
    else:
        ordered = sorted(ordered, key=lambda row: (str(row.get("last_run_at") or ""), str(row.get("created_at") or "")))
        last_slot_key = str(group.get("auto_last_slot_key") or "")
        if last_slot_key:
            ids = [str(row.get("id")) for row in ordered]
            if last_slot_key in ids and len(ordered) > 1:
                idx = ids.index(last_slot_key)
                ordered = ordered[idx + 1 :] + ordered[: idx + 1]
    return ordered[:pick_count]


def _next_auto_slot(group: dict, base: datetime | None = None) -> tuple[str, str | None]:
    slots = parse_slots(group.get("auto_slots") or "")
    if not slots:
        return "", None
    next_at = next_slot_at(slots, base=base)
    return (next_at or "", next_at)


def enqueue_due_groups():
    groups = list_auto_groups()
    now_text = now_iso()
    enqueued = []
    for group in groups:
        slots = parse_slots(group.get("auto_slots") or "")
        if not slots:
            continue
        next_auto_run_at = group.get("auto_next_run_at")
        if next_auto_run_at:
            try:
                run_at = datetime.fromisoformat(str(next_auto_run_at).replace("Z", "+00:00"))
                if run_at > datetime.now(timezone.utc):
                    continue
            except Exception:
                pass

        campaigns = list_group_campaigns(group["id"])
        if not campaigns:
            update_row("content_groups", group["id"], {"auto_last_error": "no_enabled_campaigns", "auto_last_run_at": now_text})
            create_event(
                "warning",
                "group_auto_skipped",
                "Group auto skipped: no enabled campaigns",
                {"group_id": group["id"]},
                group_id=group["id"],
            )
            continue
        selected_campaigns = _group_strategy_pick(campaigns, group)
        if not selected_campaigns:
            continue

        slot_key = str(group.get("auto_last_slot_key") or "") or (group.get("auto_next_run_at") or now_text)
        selected_topic_ids = [campaign.get("topic_id") for campaign in selected_campaigns if campaign.get("topic_id")]
        for campaign in selected_campaigns:
            run_row = insert_row(
                "campaign_runs",
                {
                    "campaign_id": campaign["id"],
                    "slot_key": slot_key,
                    "scheduled_at": group.get("auto_next_run_at") or now_text,
                    "status": "queued",
                    "queued_items": 1,
                    "selected_topic_ids": selected_topic_ids,
                },
            )
            insert_row(
                "queue_jobs",
                {
                    "job_type": "run_campaign",
                    "campaign_id": campaign["id"],
                    "group_id": group["id"],
                    "topic_id": campaign.get("topic_id"),
                    "account_id": (pick_account_for_job() or {}).get("id"),
                    "status": "pending",
                    "priority": 100,
                    "payload": {
                        "campaign_id": campaign["id"],
                        "campaign_run_id": run_row["id"],
                        "group_id": group["id"],
                        "auto_group": True,
                        "slot_key": slot_key,
                    },
                },
            )
            update_campaign(
                campaign["id"],
                {
                    "status": "queued",
                    "last_run_at": now_text,
                },
            )
            enqueued.append(campaign["id"])

        next_run_at = next_slot_at(slots)
        last_slot_key = slot_key
        update_row(
            "content_groups",
            group["id"],
            {
                "auto_next_run_at": next_run_at,
                "auto_last_run_at": now_text,
                "auto_last_slot_key": last_slot_key,
                "auto_last_result": "queued",
                "auto_last_error": "",
            },
        )
        create_event(
            "info",
            "group_auto_enqueued",
            "Group auto campaign(s) queued",
            {
                "group_id": group["id"],
                "slot_key": slot_key,
                "campaign_ids": [campaign["id"] for campaign in selected_campaigns],
                "next_run_at": next_run_at,
                "topic_ids": selected_topic_ids,
            },
            group_id=group["id"],
        )
    return enqueued


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
                "account_id": (pick_account_for_job() or {}).get("id"),
                "status": "pending",
                "priority": 100,
                "payload": {"campaign_id": campaign["id"], "campaign_run_id": run_row["id"]},
            },
        )
        slots = parse_slots(campaign.get("schedule_slots") or "")
        next_run_at = next_slot_at(slots)
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


def enqueue_due_work():
    group_enqueued = enqueue_due_groups()
    campaign_enqueued = enqueue_due_campaigns()
    upsert_setting(
        "scheduler_heartbeat",
        {
            "worker_id": "scheduler",
            "ts": now_iso(),
            "groups": len(group_enqueued),
            "campaigns": len(campaign_enqueued),
            "total": len(group_enqueued) + len(campaign_enqueued),
        },
    )
    return {
        "groups": group_enqueued,
        "campaigns": campaign_enqueued,
        "total": len(group_enqueued) + len(campaign_enqueued),
    }
