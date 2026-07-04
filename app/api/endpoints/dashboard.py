from fastapi import APIRouter

from app.schemas.dashboard import DashboardSummary
from app.repositories.content_repo import count_rows
from app.repositories.system_repo import list_logs, recent_jobs

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def get_summary():
    return DashboardSummary(
        groups=count_rows("content_groups"),
        topics=count_rows("content_topics"),
        campaigns=count_rows("content_campaigns"),
        pending_jobs=count_rows("queue_jobs", filters={"status": "pending"}),
        running_jobs=count_rows("queue_jobs", filters={"status": "running"}),
        failed_jobs=count_rows("queue_jobs", filters={"status": "failed"}),
    )


@router.get("/recent")
def get_recent():
    return {
        "jobs": recent_jobs(10),
        "events": list_logs(limit=10),
    }
