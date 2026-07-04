from fastapi import APIRouter

from app.repositories.content_repo import get_campaign_run, get_campaign_runs_page, get_queue_job, list_queue_jobs

router = APIRouter()


@router.get("/campaigns/{campaign_id}")
def list_campaign_runs_api(campaign_id: str, limit: int = 20, offset: int = 0, status: str | None = None):
    return get_campaign_runs_page(campaign_id, limit=limit, offset=offset, status=status)


@router.get("/campaign-runs/{run_id}")
def get_campaign_run_api(run_id: str):
    return get_campaign_run(run_id)


@router.get("/jobs")
def list_jobs_api(campaign_id: str | None = None, status: str | None = None, limit: int = 50, offset: int = 0):
    jobs = list_queue_jobs(campaign_id=campaign_id, status=status, limit=None)
    start = max(0, int(offset or 0))
    end = start + int(limit or 50)
    return jobs[start:end]


@router.get("/jobs/{job_id}")
def get_job_api(job_id: str):
    return get_queue_job(job_id)
