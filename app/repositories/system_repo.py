from __future__ import annotations

from typing import Any

from app.core.db import get_supabase_client


def _client():
    return get_supabase_client()


def _refetch_account(account_id: str):
    rows = _client().table("tg_accounts").select("*").eq("id", account_id).limit(1).execute().data or []
    return _normalize_account_row(rows[0]) if rows else None


def _normalize_account_row(row: dict[str, Any] | None):
    if not row:
        return row
    normalized = dict(row)
    daily_limit = int(normalized.get("daily_job_limit") or 0)
    if daily_limit <= 0:
        normalized["daily_job_limit"] = 30
        normalized["quota_source"] = "default"
    else:
        normalized["quota_source"] = "backend"
    daily_count = int(normalized.get("daily_job_count") or 0)
    if daily_count < 0:
        normalized["daily_job_count"] = 0
    if not normalized.get("risk_status"):
        normalized["risk_status"] = "active"
    if normalized.get("is_active") is None:
        normalized["is_active"] = False
    return normalized


def list_accounts():
    try:
        rows = _client().table("tg_accounts").select("*").order("created_at", desc=True).execute().data or []
        return [_normalize_account_row(row) for row in rows]
    except Exception:
        return []


def get_account_by_id(account_id: str):
    try:
        rows = _client().table("tg_accounts").select("*").eq("id", account_id).limit(1).execute().data or []
        return _normalize_account_row(rows[0]) if rows else None
    except Exception:
        return None


def create_account(payload: dict[str, Any]):
    try:
        normalized_payload = dict(payload)
        if int(normalized_payload.get("daily_job_limit") or 0) <= 0:
            normalized_payload["daily_job_limit"] = 30
        inserted = _client().table("tg_accounts").insert(normalized_payload).execute().data or []
        row = inserted[0] if inserted else None
        return _refetch_account(row["id"]) if row and row.get("id") else _normalize_account_row(row)
    except Exception:
        return None


def update_account(account_id: str, payload: dict[str, Any]):
    try:
        normalized_payload = dict(payload)
        if "daily_job_limit" in normalized_payload and int(normalized_payload.get("daily_job_limit") or 0) <= 0:
            normalized_payload["daily_job_limit"] = 30
        _client().table("tg_accounts").update(normalized_payload).eq("id", account_id).execute()
        return _refetch_account(account_id)
    except Exception:
        return None


def normalize_account_quota(account_id: str, *, default_limit: int = 30):
    try:
        _client().table("tg_accounts").update({"daily_job_limit": default_limit}).eq("id", account_id).execute()
        return _refetch_account(account_id)
    except Exception:
        return None


def delete_account(account_id: str):
    try:
        _client().table("tg_accounts").delete().eq("id", account_id).execute()
        return True
    except Exception:
        return False


def resume_account(account_id: str):
    payload = {
        "is_active": True,
        "risk_status": "active",
        "risk_reason": "",
        "last_error": "",
    }
    try:
        updated = _client().table("tg_accounts").update(payload).eq("id", account_id).execute().data or []
        row = updated[0] if updated else None
        refetched = _refetch_account(account_id)
        return {
            "ok": bool(row or refetched),
            "updated": _normalize_account_row(row),
            "refetched": refetched,
            "payload": payload,
            "error": None,
        }
    except Exception as exc:
        return {
            "ok": False,
            "updated": None,
            "refetched": _refetch_account(account_id),
            "payload": payload,
            "error": str(exc),
        }


def list_settings():
    try:
        return _client().table("settings").select("*").order("key").execute().data or []
    except Exception:
        return []


def upsert_setting(key: str, value: Any):
    try:
        return (_client().table("settings").upsert({"key": key, "value": value}).execute().data or [None])[0]
    except Exception:
        return None


def list_profiles():
    try:
        return _client().table("profiles").select("*").order("created_at", desc=True).execute().data or []
    except Exception:
        return []


def update_profile_role(profile_id: str, role: str):
    try:
        return (_client().table("profiles").update({"role": role}).eq("id", profile_id).execute().data or [None])[0]
    except Exception:
        return None


def insert_audit_log(*, actor_id: str | None, action: str, entity_type: str, entity_id: str | None = None, metadata: dict[str, Any] | None = None):
    payload = {
        "actor_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
    }
    try:
        return (_client().table("audit_logs").insert(payload).execute().data or [payload])[0]
    except Exception:
        return payload


def count_profiles_by_role(role: str | None = None):
    try:
        query = _client().table("profiles").select("id", count="exact")
        if role:
            query = query.eq("role", role)
        return query.execute().count or 0
    except Exception:
        return 0


def list_logs(*, entity_type: str | None = None, entity_id: str | None = None, level: str | None = None, limit: int = 100, q: str | None = None):
    try:
        query = _client().table("content_events").select("*").order("created_at", desc=True).limit(limit)
        if entity_type == "group" and entity_id:
            query = query.eq("group_id", entity_id)
        elif entity_type == "topic" and entity_id:
            query = query.eq("topic_id", entity_id)
        elif entity_type == "campaign" and entity_id:
            query = query.eq("campaign_id", entity_id)
        if level:
            query = query.eq("level", level)
        if q:
            query = query.or_(f"code.ilike.%{q}%,message.ilike.%{q}%")
        return query.execute().data or []
    except Exception:
        return []


def recent_jobs(limit: int = 10):
    try:
        return _client().table("queue_jobs").select("*").order("created_at", desc=True).limit(limit).execute().data or []
    except Exception:
        return []
