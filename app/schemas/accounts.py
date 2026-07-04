from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    api_id: int | None = None
    api_hash: str | None = None
    phone: str | None = None
    session_ref: str | None = None
    is_active: bool = False
    daily_job_limit: int | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    api_id: int | None = None
    api_hash: str | None = None
    phone: str | None = None
    session_ref: str | None = None
    is_active: bool | None = None
    status: str | None = None
    last_checked_at: str | None = None
    last_error: str | None = None
    risk_status: str | None = None
    risk_reason: str | None = None
    daily_job_limit: int | None = None
    daily_job_count: int | None = None
