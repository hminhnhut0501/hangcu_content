import asyncio
import os
import random
import traceback

from app.repositories.content_repo import (
    claim_pending_job,
    create_event,
    finish_job,
    get_row,
    increment_account_job_count,
    pause_account,
    pick_account_for_job,
    release_stale_jobs,
    retry_job,
    update_campaign,
)


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


async def _safe_sleep():
    await asyncio.sleep(_jitter_delay())


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
        campaign = get_row("content_campaigns", campaign_id) if campaign_id else None
        if not campaign:
            raise RuntimeError("Campaign not found")
        create_event(
            "info",
            "job_running",
            "Running campaign job",
            {"job_id": job["id"], "campaign_id": campaign_id},
            campaign_id=campaign_id,
        )
        await _safe_sleep()
        increment_account_job_count(account_id)
        update_campaign(
            campaign_id,
            {
                "last_run_at": campaign.get("last_run_at") or None,
                "last_result": "success",
            },
        )
        return {
            "job_type": job_type,
            "campaign_id": campaign_id,
            "account_id": account_id,
            "message": "Executed placeholder job successfully",
        }
    raise RuntimeError(f"Unsupported job_type: {job_type}")


async def loop():
    while True:
        try:
            release_stale_jobs()
            job = claim_pending_job(WORKER_ID, lock_seconds=LOCK_SECONDS)
            if not job:
                await asyncio.sleep(POLL_INTERVAL)
                continue
            try:
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
                    if job.get("account_id") and _looks_risky(error_message):
                        pause_account(job["account_id"], error_message)
                    create_event(
                        "error",
                        "job_failed",
                        "Job execution failed",
                        {"job_id": job["id"], "error": error_message, "trace": traceback.format_exc()},
                        campaign_id=job.get("campaign_id"),
                    )
        except Exception:
            await asyncio.sleep(POLL_INTERVAL)


def main():
    asyncio.run(loop())


if __name__ == "__main__":
    main()
