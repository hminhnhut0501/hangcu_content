import asyncio
import os
import random
import re
import sys
import traceback

from app.repositories.content_repo import (
    claim_pending_job,
    create_event,
    finish_job,
    get_row,
    increment_account_job_count,
    now_iso,
    pause_account,
    pick_account_for_job,
    release_stale_jobs,
    retry_job,
    update_campaign,
    update_row,
)
from app.repositories.system_repo import upsert_setting
from app.services.account_service import build_telegram_client
from telethon.tl.types import Message


WORKER_ID = os.getenv("WORKER_ID", "worker-1")
POLL_INTERVAL = float(os.getenv("WORKER_POLL_INTERVAL", "5"))
LOCK_SECONDS = int(os.getenv("WORKER_LOCK_SECONDS", "120"))
MAX_ATTEMPTS = int(os.getenv("WORKER_MAX_ATTEMPTS", "3"))
SAFE_DELAY_MIN = float(os.getenv("WORKER_SAFE_DELAY_MIN", "1.5"))
SAFE_DELAY_MAX = float(os.getenv("WORKER_SAFE_DELAY_MAX", "4.5"))
ACCOUNT_DAILY_HARD_LIMIT = int(os.getenv("ACCOUNT_DAILY_HARD_LIMIT", "30"))
FLOODWAIT_KEYWORDS = ("floodwait", "too many requests", "rate limit", "peer flooded", "slow down", "spam")


def _jitter_delay() -> float:
    return random.uniform(SAFE_DELAY_MIN, SAFE_DELAY_MAX)


def _looks_risky(message: str) -> bool:
    lower = (message or "").lower()
    return any(keyword in lower for keyword in FLOODWAIT_KEYWORDS)


def _extract_floodwait_seconds(message: str) -> int | None:
    lower = (message or "").lower()
    if "floodwait" not in lower:
        return None
    digits = "".join(ch for ch in lower if ch.isdigit())
    return int(digits) if digits else None


def _parse_tme_link(raw: str):
    value = str(raw or "").strip().replace("https://", "").replace("http://", "").rstrip("/")
    match = re.search(r"t\.me/c/(\d+)/(\d+)(?:/\d+)?", value)
    if match:
        return int(f"-100{match.group(1)}"), int(match.group(2))
    match = re.search(r"t\.me/([^/?#]+)(?:/(\d+))?$", value)
    if match:
        username = match.group(1)
        msg_id = int(match.group(2)) if match.group(2) and match.group(2).isdigit() else None
        return username, msg_id
    if value.lstrip("-").isdigit():
        return int(value), None
    return value or None, None


def _message_sort_key(msg):
    return int(getattr(msg, "id", 0) or 0)


async def _load_source_messages(client, campaign: dict) -> list[Message]:
    start_link = str(campaign.get("source_start_link") or "").strip()
    end_link = str(campaign.get("source_end_link") or "").strip()
    batch_size = max(1, min(50, int(campaign.get("batch_size") or 1)))
    follow_latest = bool(campaign.get("follow_latest", True))
    last_msg_id = int(campaign.get("last_msg_id") or 0)

    source_ref, start_msg_id = _parse_tme_link(start_link) if start_link else (None, None)
    end_ref, end_msg_id = _parse_tme_link(end_link) if end_link else (source_ref, None)
    source_ref = source_ref or end_ref
    if not source_ref:
        raise RuntimeError("Missing source link")

    source_entity = await client.get_entity(source_ref)

    if start_msg_id and end_msg_id and start_msg_id > end_msg_id:
        start_msg_id, end_msg_id = end_msg_id, start_msg_id

    if start_msg_id and end_msg_id:
        ids = list(range(start_msg_id, end_msg_id + 1))
        messages = await client.get_messages(source_entity, ids=ids)
        if isinstance(messages, list):
            return [msg for msg in sorted(messages, key=_message_sort_key) if msg]
        return [messages] if messages else []

    if follow_latest and last_msg_id > 0:
        messages = await client.get_messages(source_entity, min_id=last_msg_id, limit=batch_size)
        return [msg for msg in sorted(messages, key=_message_sort_key) if msg]

    messages = await client.get_messages(source_entity, limit=batch_size)
    return [msg for msg in sorted(messages, key=_message_sort_key) if msg]


async def _send_message_like(client, target_entity, message, *, default_caption: str = "") -> None:
    text = (getattr(message, "message", None) or "").strip()
    caption = text or default_caption or ""
    if getattr(message, "media", None):
        await client.send_file(target_entity, message.media, caption=caption)
        return
    if caption:
        await client.send_message(target_entity, caption)
        return
    # Keep empty messages visible in logs but do not send blank payloads.
    raise RuntimeError(f"Empty message #{getattr(message, 'id', 0)}")


async def _run_campaign_telegram(job: dict, campaign: dict, client, account_id: str):
    payload = job.get("payload") or {}
    run_id = payload.get("campaign_run_id") if isinstance(payload, dict) else None
    target_link = str(campaign.get("target_link") or "").strip()
    if not target_link:
        raise RuntimeError("Missing target_link")

    target_ref, target_topic_id = _parse_tme_link(target_link)
    if not target_ref:
        raise RuntimeError("Invalid target_link")
    target_entity = await client.get_entity(target_ref)

    source_messages = await _load_source_messages(client, campaign)
    if not source_messages:
        raise RuntimeError("No source messages to send")

    delay_min = max(0, int(campaign.get("delay_min") or 0))
    delay_max = max(delay_min, int(campaign.get("delay_max") or delay_min))
    total_sent = 0
    last_source_msg_id = int(campaign.get("last_msg_id") or 0)
    caption_prefix = str(campaign.get("caption") or "").strip()
    for msg in source_messages:
        await _send_message_like(client, target_entity, msg, default_caption=caption_prefix)
        total_sent += 1
        last_source_msg_id = max(last_source_msg_id, int(getattr(msg, "id", 0) or 0))
        if delay_max > 0 and total_sent < len(source_messages):
            await asyncio.sleep(random.uniform(delay_min, delay_max) if delay_max > delay_min else float(delay_min))

    increment_account_job_count(account_id)
    update_campaign(
        campaign["id"],
        {
            "last_run_at": now_iso(),
            "last_result": "success",
            "status": "done",
            "sent_count": int(campaign.get("sent_count") or 0) + 1,
            "sent_units_count": int(campaign.get("sent_units_count") or 0) + total_sent,
            "last_msg_id": last_source_msg_id,
        },
    )
    if run_id:
        update_row(
            "campaign_runs",
            run_id,
            {
                "status": "success",
                "queued_items": total_sent,
                "finished_at": now_iso(),
            },
        )
    create_event(
        "info",
        "campaign_sent",
        "Campaign sent successfully",
        {
            "campaign_id": campaign["id"],
            "account_id": account_id,
            "sent_units": total_sent,
            "last_msg_id": last_source_msg_id,
            "target_topic_id": target_topic_id,
        },
        campaign_id=campaign["id"],
    )
    return {
        "job_type": "run_campaign",
        "campaign_id": campaign["id"],
        "campaign_run_id": run_id,
        "account_id": account_id,
        "sent_units": total_sent,
        "last_msg_id": last_source_msg_id,
        "target_topic_id": target_topic_id,
    }


async def _safe_sleep():
    await asyncio.sleep(_jitter_delay())


def _touch_worker_heartbeat(*, status: str = "idle", detail: dict | None = None):
    upsert_setting(
        "worker_heartbeat",
        {
            "worker_id": WORKER_ID,
            "ts": now_iso(),
            "status": status,
            "detail": detail or {},
        },
    )


async def execute_job(job: dict):
    job_type = job.get("job_type")
    account_id = job.get("account_id")
    account = get_row("tg_accounts", account_id) if account_id else None
    if not account:
        account = pick_account_for_job()
        account_id = account.get("id") if account else None
    if not account_id:
        raise RuntimeError("No eligible Telegram account available")
    if (account.get("risk_status") or "active") != "active" or not account.get("is_active", True):
        raise RuntimeError("Account paused or risky")
    used = int(account.get("daily_job_count") or 0)
    limit = int(account.get("daily_job_limit") or ACCOUNT_DAILY_HARD_LIMIT)
    if limit and used >= limit:
        raise RuntimeError("Account daily limit reached")
    await _safe_sleep()
    if job_type == "run_campaign":
        campaign_id = job.get("campaign_id")
        payload = job.get("payload") or {}
        run_id = payload.get("campaign_run_id") if isinstance(payload, dict) else None
        campaign = get_row("content_campaigns", campaign_id) if campaign_id else None
        if not campaign:
            raise RuntimeError("Campaign not found")
        started_at = now_iso()
        if run_id:
            update_row("campaign_runs", run_id, {"status": "running", "started_at": started_at})
        create_event(
            "info",
            "job_running",
            "Running campaign job",
            {"job_id": job["id"], "campaign_id": campaign_id},
            campaign_id=campaign_id,
        )
        client = None
        try:
            client = build_telegram_client(account)
            await client.connect()
            if not await client.is_user_authorized():
                pause_account(account_id, "Telegram account unauthorized")
                create_event(
                    "error",
                    "account_unauthorized",
                    "Telegram account unauthorized",
                    {"account_id": account_id},
                    campaign_id=campaign_id,
                )
                raise RuntimeError("Telegram account unauthorized")
            result = await _run_campaign_telegram(job, campaign, client, account_id)
            return result
        finally:
            if client is not None:
                try:
                    await client.disconnect()
                except Exception:
                    pass
    raise RuntimeError(f"Unsupported job_type: {job_type}")


async def loop():
    while True:
        try:
            _touch_worker_heartbeat(status="running", detail={"stage": "tick"})
            release_stale_jobs()
            job = claim_pending_job(WORKER_ID, lock_seconds=LOCK_SECONDS)
            if not job:
                _touch_worker_heartbeat(status="idle", detail={"stage": "sleep"})
                await asyncio.sleep(POLL_INTERVAL)
                continue
            try:
                _touch_worker_heartbeat(status="busy", detail={"job_id": job.get("id"), "job_type": job.get("job_type")})
                result = await execute_job(job)
                finish_job(job["id"], "success", result=result, attempts=int(job.get("attempts") or 0))
                if job.get("campaign_id"):
                    update_campaign(job["campaign_id"], {"last_result": "success"})
            except Exception as exc:
                attempts = int(job.get("attempts") or 0) + 1
                error_message = str(exc)
                if job.get("account_id") and _looks_risky(error_message):
                    reason = error_message
                    floodwait_seconds = _extract_floodwait_seconds(error_message)
                    if floodwait_seconds:
                        reason = f"FloodWait {floodwait_seconds}s"
                    pause_account(job["account_id"], reason)
                    create_event(
                        "error",
                        "account_paused",
                        "Telegram account paused by risk guard",
                        {"account_id": job["account_id"], "reason": reason},
                        campaign_id=job.get("campaign_id"),
                    )
                if attempts < MAX_ATTEMPTS:
                    backoff_seconds = max(30, 15 * attempts)
                    if _looks_risky(error_message):
                        backoff_seconds = max(backoff_seconds, 300)
                    retry_job(job["id"], error=error_message, attempts=attempts, backoff_seconds=backoff_seconds)
                    create_event(
                        "info",
                        "job_retry",
                        "Job retry scheduled",
                        {"job_id": job["id"], "attempts": attempts, "error": error_message, "backoff_seconds": backoff_seconds},
                        campaign_id=job.get("campaign_id"),
                    )
                else:
                    finish_job(job["id"], "failed", error=error_message, attempts=attempts)
                    if job.get("campaign_id"):
                        update_campaign(job["campaign_id"], {"last_result": "failed"})
                    payload = job.get("payload") or {}
                    run_id = payload.get("campaign_run_id") if isinstance(payload, dict) else None
                    if run_id:
                        update_row("campaign_runs", run_id, {"status": "failed", "last_error": error_message})
                    if job.get("account_id") and (
                        _looks_risky(error_message) or "unauthorized" in error_message.lower() or "invalid" in error_message.lower()
                    ):
                        pause_account(job["account_id"], error_message)
                    create_event(
                        "error",
                        "job_failed",
                        "Job execution failed",
                        {"job_id": job["id"], "error": error_message, "trace": traceback.format_exc()},
                        campaign_id=job.get("campaign_id"),
                    )
                _touch_worker_heartbeat(status="error", detail={"job_id": job.get("id"), "error": error_message})
        except Exception:
            _touch_worker_heartbeat(status="error", detail={"stage": "loop", "trace": traceback.format_exc()})
            await asyncio.sleep(POLL_INTERVAL)


def main():
    print(
        f"[worker] booting pid={os.getpid()} worker_id={WORKER_ID} poll_interval={POLL_INTERVAL}",
        file=sys.stdout,
        flush=True,
    )
    _touch_worker_heartbeat(status="booting", detail={"stage": "startup", "pid": os.getpid()})
    print("[worker] heartbeat written", file=sys.stdout, flush=True)
    asyncio.run(loop())


if __name__ == "__main__":
    main()
