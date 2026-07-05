from __future__ import annotations

from datetime import datetime, timezone
from datetime import timedelta
from typing import Any

from app.core.db import get_supabase_client
from app.services.schema_service import has_column


def _client():
    return get_supabase_client()


def list_rows(table: str, *, select: str = "*", filters: dict[str, Any] | None = None, order: str | None = None):
    try:
        query = _client().table(table).select(select)
        for key, value in (filters or {}).items():
            if value is None:
                continue
            query = query.eq(key, value)
        if order:
            descending = order.startswith("-")
            column = order[1:] if descending else order
            query = query.order(column, desc=descending)
        return query.execute().data or []
    except Exception:
        return []


def list_rows_filtered(
    table: str,
    *,
    select: str = "*",
    filters: dict[str, Any] | None = None,
    order: str | None = None,
    search: tuple[str, str] | None = None,
    limit: int | None = None,
    offset: int | None = None,
):
    try:
        query = _client().table(table).select(select)
        for key, value in (filters or {}).items():
            if value is None:
                continue
            query = query.eq(key, value)
        if search and search[1]:
            column, term = search
            query = query.ilike(column, f"%{term}%")
        if order:
            descending = order.startswith("-")
            column = order[1:] if descending else order
            query = query.order(column, desc=descending)
        if limit is not None:
            query = query.range(int(offset or 0), int(offset or 0) + int(limit) - 1)
        return query.execute().data or []
    except Exception:
        return []


def get_row(table: str, row_id: str, *, select: str = "*"):
    try:
        response = _client().table(table).select(select).eq("id", row_id).limit(1).execute()
        rows = response.data or []
        return rows[0] if rows else None
    except Exception:
        return None


def insert_row(table: str, payload: dict[str, Any], *, raise_error: bool = False):
    try:
        return (_client().table(table).insert(payload).execute().data or [None])[0]
    except Exception as exc:
        if raise_error:
            raise
        return None


def update_row(table: str, row_id: str, payload: dict[str, Any]):
    try:
        return (
            _client()
            .table(table)
            .update(payload)
            .eq("id", row_id)
            .execute()
            .data
            or [None]
        )[0]
    except Exception:
        return None


def delete_row(table: str, row_id: str):
    try:
        _client().table(table).delete().eq("id", row_id).execute()
        return True
    except Exception:
        return False


def create_event(level: str, code: str, message: str, payload: dict[str, Any] | None = None, *, group_id=None, topic_id=None, campaign_id=None):
    data = {
        "level": level,
        "code": code,
        "message": message,
        "payload": payload or {},
        "group_id": group_id,
        "topic_id": topic_id,
        "campaign_id": campaign_id,
    }
    try:
        return _client().table("content_events").insert(data).execute().data
    except Exception:
        return []


def count_rows(table: str, *, filters: dict[str, Any] | None = None) -> int:
    try:
        query = _client().table(table).select("id", count="exact")
        for key, value in (filters or {}).items():
            if value is None:
                continue
            query = query.eq(key, value)
        response = query.execute()
        return int(getattr(response, "count", 0) or 0)
    except Exception:
        return 0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def utc_now():
    return datetime.now(timezone.utc)


def iso_in(seconds: int) -> str:
    return (utc_now() + timedelta(seconds=int(seconds))).isoformat()


def claim_pending_job(worker_id: str, *, lock_seconds: int = 120):
    client = _client()
    rows = (
        client.table("queue_jobs")
        .select("*")
        .eq("status", "pending")
        .order("priority", desc=False)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        return None
    job = rows[0]
    updated = (
        client.table("queue_jobs")
        .update(
            {
                "status": "running",
                "locked_by": worker_id,
                "locked_at": now_iso(),
                "started_at": now_iso(),
                "lock_expires_at": iso_in(lock_seconds),
            }
        )
        .eq("id", job["id"])
        .eq("status", "pending")
        .execute()
        .data
        or []
    )
    return updated[0] if updated else None


def finish_job(
    job_id: str,
    status: str,
    result: dict[str, Any] | None = None,
    error: str | None = None,
    *,
    attempts: int | None = None,
    next_retry_at: str | None = None,
):
    payload: dict[str, Any] = {
        "status": status,
        "finished_at": now_iso(),
        "result": result or {},
        "last_error": error or "",
        "lock_expires_at": None,
    }
    if attempts is not None:
        payload["attempts"] = int(attempts)
    if next_retry_at is not None:
        payload["next_retry_at"] = next_retry_at
    return _client().table("queue_jobs").update(payload).eq("id", job_id).execute().data


def retry_job(job_id: str, *, error: str, attempts: int, backoff_seconds: int):
    status = "pending" if attempts > 0 else "failed"
    payload = {
        "status": status,
        "last_error": error,
        "attempts": attempts,
        "finished_at": None,
        "started_at": None,
        "locked_by": None,
        "locked_at": None,
        "lock_expires_at": None,
        "next_retry_at": iso_in(backoff_seconds) if status == "pending" else None,
    }
    return _client().table("queue_jobs").update(payload).eq("id", job_id).execute().data


def release_stale_jobs():
    client = _client()
    rows = (
        client.table("queue_jobs")
        .select("*")
        .eq("status", "running")
        .execute()
        .data
        or []
    )
    released = []
    now = utc_now()
    for job in rows:
        lock_expires_at = job.get("lock_expires_at")
        if not lock_expires_at:
            continue
        try:
            expires = datetime.fromisoformat(lock_expires_at.replace("Z", "+00:00"))
        except Exception:
            continue
        if expires > now:
            continue
        client.table("queue_jobs").update(
            {
                "status": "pending",
                "locked_by": None,
                "locked_at": None,
                "lock_expires_at": None,
                "started_at": None,
                "next_retry_at": None,
                "last_error": "lock expired",
            }
        ).eq("id", job["id"]).execute()
        released.append(job["id"])
    return released


def list_due_campaigns():
    client = _client()
    rows = (
        client.table("content_campaigns")
        .select("*")
        .eq("schedule_enabled", True)
        .eq("enabled", True)
        .order("next_run_at", desc=False)
        .execute()
        .data
        or []
    )
    now = utc_now()
    due = []
    for row in rows:
        next_run_at = row.get("next_run_at")
        if not next_run_at:
            continue
        try:
            run_at = datetime.fromisoformat(next_run_at.replace("Z", "+00:00"))
        except Exception:
            continue
        if run_at <= now:
            due.append(row)
    return due


def update_campaign(campaign_id: str, payload: dict[str, Any]):
    return _client().table("content_campaigns").update(payload).eq("id", campaign_id).execute().data


def _today_key():
    return utc_now().date().isoformat()


def _reset_account_if_needed(account: dict[str, Any]):
    reset_at = account.get("daily_job_reset_at")
    today = _today_key()
    if not reset_at or str(reset_at)[:10] != today:
        payload: dict[str, Any] = {}
        if has_column("tg_accounts", "daily_job_count"):
            payload["daily_job_count"] = 0
        if has_column("tg_accounts", "daily_job_reset_at"):
            payload["daily_job_reset_at"] = now_iso()
        if payload:
            _client().table("tg_accounts").update(payload).eq("id", account["id"]).execute()
        account["daily_job_count"] = 0
        account["daily_job_reset_at"] = now_iso()


def get_available_accounts():
    rows = (
        _client()
        .table("tg_accounts")
        .select("*")
        .eq("is_active", True)
        .execute()
        .data
        or []
    )
    eligible = []
    for account in rows:
        if (account.get("risk_status") or "active") != "active":
            continue
        _reset_account_if_needed(account)
        limit = int(account.get("daily_job_limit") or 0)
        used = int(account.get("daily_job_count") or 0)
        if limit and used >= limit:
            continue
        eligible.append(account)
    eligible.sort(key=lambda a: (int(a.get("daily_job_count") or 0), str(a.get("updated_at") or "")))
    return eligible


def pick_account_for_job() -> dict[str, Any] | None:
    accounts = get_available_accounts()
    if not accounts:
        return None
    return accounts[0]


def increment_account_job_count(account_id: str):
    account = get_row("tg_accounts", account_id)
    if not account:
        return None
    _reset_account_if_needed(account)
    new_count = int(account.get("daily_job_count") or 0) + 1
    payload: dict[str, Any] = {}
    if has_column("tg_accounts", "daily_job_count"):
        payload["daily_job_count"] = new_count
    if has_column("tg_accounts", "daily_job_reset_at"):
        payload["daily_job_reset_at"] = account.get("daily_job_reset_at") or now_iso()
    if not payload:
        return None
    return _client().table("tg_accounts").update(payload).eq("id", account_id).execute().data


def pause_account(account_id: str, reason: str):
    return _client().table("tg_accounts").update(
        {
            "is_active": False,
            "last_error": reason,
        }
    ).eq("id", account_id).execute().data


def clear_account_risk(account_id: str):
    return None


def get_campaign_runs(campaign_id: str, limit: int = 20):
    return get_campaign_runs_page(campaign_id, limit=limit, offset=0)


def get_campaign_runs_page(campaign_id: str, limit: int = 20, offset: int = 0, status: str | None = None):
    query = _client().table("campaign_runs").select("*").eq("campaign_id", campaign_id)
    if has_column("campaign_runs", "created_at"):
        query = query.order("created_at", desc=True)
    if status:
        query = query.eq("status", status)
    if limit is not None:
        query = query.range(int(offset or 0), int(offset or 0) + int(limit) - 1)
    return query.execute().data or []


def get_campaign_run(run_id: str):
    rows = (
        _client()
        .table("campaign_runs")
        .select("*")
        .eq("id", run_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def list_queue_jobs(*, campaign_id: str | None = None, status: str | None = None, limit: int = 50):
    query = _client().table("queue_jobs").select("*")
    if has_column("queue_jobs", "created_at"):
        query = query.order("created_at", desc=True)
    if campaign_id:
        query = query.eq("campaign_id", campaign_id)
    if status:
        query = query.eq("status", status)
    if limit is not None:
        query = query.range(0, int(limit) - 1)
    return query.execute().data or []


def get_queue_job(job_id: str):
    rows = (
        _client()
        .table("queue_jobs")
        .select("*")
        .eq("id", job_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def list_auto_groups():
    query = _client().table("content_groups").select("*").eq("auto_enabled", True).eq("status", "active")
    if has_column("content_groups", "updated_at"):
        query = query.order("updated_at", desc=False)
    return query.execute().data or []


def list_group_topics(group_id: str):
    query = _client().table("content_topics").select("*").eq("group_id", group_id).eq("status", "active")
    if has_column("content_topics", "sort_order"):
        query = query.order("sort_order", desc=False)
    if has_column("content_topics", "created_at"):
        query = query.order("created_at", desc=False)
    return query.execute().data or []


def list_group_campaigns(group_id: str):
    query = _client().table("content_campaigns").select("*").eq("group_id", group_id).eq("enabled", True)
    if has_column("content_campaigns", "last_run_at"):
        query = query.order("last_run_at", desc=False)
    if has_column("content_campaigns", "created_at"):
        query = query.order("created_at", desc=False)
    return query.execute().data or []
