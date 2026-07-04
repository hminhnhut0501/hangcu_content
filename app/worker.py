import asyncio
import os
import traceback

from app.repositories.content_repo import (
    claim_pending_job,
    create_event,
    finish_job,
    get_row,
    release_stale_jobs,
    retry_job,
    update_campaign,
)


WORKER_ID = os.getenv("WORKER_ID", "worker-1")
POLL_INTERVAL = float(os.getenv("WORKER_POLL_INTERVAL", "5"))
LOCK_SECONDS = int(os.getenv("WORKER_LOCK_SECONDS", "120"))
MAX_ATTEMPTS = int(os.getenv("WORKER_MAX_ATTEMPTS", "3"))


async def execute_job(job: dict):
    job_type = job.get("job_type")
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
        await asyncio.sleep(0.1)
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
                if attempts < MAX_ATTEMPTS:
                    retry_job(job["id"], error=str(exc), attempts=attempts, backoff_seconds=15 * attempts)
                    create_event(
                        "info",
                        "job_retry",
                        "Job retry scheduled",
                        {"job_id": job["id"], "attempts": attempts, "error": str(exc)},
                        campaign_id=job.get("campaign_id"),
                    )
                else:
                    finish_job(job["id"], "failed", error=str(exc), attempts=attempts)
                    if job.get("campaign_id"):
                        update_campaign(job["campaign_id"], {"last_result": "failed"})
                    create_event(
                        "error",
                        "job_failed",
                        "Job execution failed",
                        {"job_id": job["id"], "error": str(exc), "trace": traceback.format_exc()},
                        campaign_id=job.get("campaign_id"),
                    )
        except Exception:
            await asyncio.sleep(POLL_INTERVAL)


def main():
    asyncio.run(loop())


if __name__ == "__main__":
    main()
