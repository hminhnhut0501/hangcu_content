from __future__ import annotations

from typing import Any

from app.core.db import get_supabase_client


def _client():
    return get_supabase_client()


def list_accounts():
    try:
        return _client().table("tg_accounts").select("*").order("created_at", desc=True).execute().data or []
    except Exception:
        return []


def get_account_by_id(account_id: str):
    try:
        rows = _client().table("tg_accounts").select("*").eq("id", account_id).limit(1).execute().data or []
        return rows[0] if rows else None
    except Exception:
        return None


def create_account(payload: dict[str, Any]):
    try:
        return (_client().table("tg_accounts").insert(payload).execute().data or [None])[0]
    except Exception:
        return None


def update_account(account_id: str, payload: dict[str, Any]):
    try:
        return (_client().table("tg_accounts").update(payload).eq("id", account_id).execute().data or [None])[0]
    except Exception:
        return None


def delete_account(account_id: str):
    try:
        _client().table("tg_accounts").delete().eq("id", account_id).execute()
        return True
    except Exception:
        return False


def resume_account(account_id: str):
    try:
        return (_client().table("tg_accounts").update({
            "is_active": True,
            "risk_status": "active",
            "risk_reason": "",
            "last_error": "",
        }).eq("id", account_id).execute().data or [None])[0]
    except Exception:
        return None


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
