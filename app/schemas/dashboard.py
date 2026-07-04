from pydantic import BaseModel


class DashboardSummary(BaseModel):
    groups: int = 0
    auto_groups: int = 0
    topics: int = 0
    campaigns: int = 0
    scheduled_campaigns: int = 0
    pending_jobs: int = 0
    running_jobs: int = 0
    failed_jobs: int = 0
