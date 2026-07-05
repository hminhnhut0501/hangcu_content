from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthUser, require_admin
from app.core.db import get_supabase_client
from app.core.config import settings
import psycopg
from app.repositories.system_repo import list_profiles, update_profile_role, count_profiles_by_role, insert_audit_log
from app.schemas.auth import InvitePayload

router = APIRouter()


SCHEMA_EXPECTATIONS: dict[str, set[str]] = {
    "tg_accounts": {
        "id",
        "name",
        "api_id",
        "api_hash",
        "phone",
        "session_ref",
        "is_active",
        "status",
        "last_checked_at",
        "last_error",
        "daily_job_limit",
        "daily_job_count",
        "daily_job_reset_at",
        "created_at",
        "updated_at",
    },
    "queue_jobs": {
        "id",
        "job_type",
        "group_id",
        "topic_id",
        "campaign_id",
        "account_id",
        "priority",
        "status",
        "scheduled_at",
        "started_at",
        "finished_at",
        "attempts",
        "max_attempts",
        "locked_by",
        "locked_at",
        "last_error",
        "payload",
        "result",
        "created_at",
        "updated_at",
    },
    "content_groups": {
        "id",
        "name",
        "source_key",
        "source_link",
        "target_link",
        "auto_enabled",
        "auto_slots",
        "auto_pick_count",
        "auto_strategy",
        "auto_next_run_at",
        "auto_last_run_at",
        "auto_last_slot_key",
        "auto_last_result",
        "auto_last_error",
        "status",
        "created_at",
        "updated_at",
    },
    "content_topics": {
        "id",
        "group_id",
        "name",
        "source_topic_id",
        "target_topic_id",
        "target_link_seed",
        "last_msg_id",
        "sort_order",
        "status",
        "created_at",
        "updated_at",
    },
    "content_campaigns": {
        "id",
        "group_id",
        "topic_id",
        "title",
        "source_start_link",
        "source_end_link",
        "follow_latest",
        "target_link",
        "caption",
        "group_mode",
        "order_mode",
        "batch_size",
        "delay_min",
        "delay_max",
        "enabled",
        "status",
        "schedule_enabled",
        "schedule_slots",
        "next_run_at",
        "last_run_at",
        "last_result",
        "last_msg_id",
        "sent_count",
        "sent_units_count",
        "created_at",
        "updated_at",
    },
    "settings": {"key", "value", "updated_at"},
    "profiles": {"id", "full_name", "role", "created_at", "updated_at"},
    "campaign_runs": {
        "id",
        "campaign_id",
        "slot_key",
        "scheduled_at",
        "status",
        "selected_topic_ids",
        "queued_items",
        "started_at",
        "finished_at",
        "last_error",
        "created_at",
        "updated_at",
    },
    "content_events": {
        "id",
        "group_id",
        "topic_id",
        "campaign_id",
        "level",
        "code",
        "message",
        "payload",
        "created_at",
    },
    "audit_logs": {"id", "actor_id", "action", "entity_type", "entity_id", "metadata", "created_at"},
}


def _get_real_schema() -> dict[str, set[str]]:
    db_url = settings.supabase_db_url
    if not db_url:
        return {}
    tables = list(SCHEMA_EXPECTATIONS.keys())
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select table_name, column_name
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = any(%s)
                order by table_name, ordinal_position
                """,
                (tables,),
            )
            schema: dict[str, set[str]] = {table: set() for table in tables}
            for table_name, column_name in cur.fetchall():
                schema.setdefault(table_name, set()).add(column_name)
            return schema


@router.get("/schema/reconcile")
def schema_reconcile(user: AuthUser = Depends(require_admin)):
    actual = _get_real_schema()
    missing = {}
    extra = {}
    for table, expected_columns in SCHEMA_EXPECTATIONS.items():
        actual_columns = actual.get(table, set())
        missing_cols = sorted(expected_columns - actual_columns)
        extra_cols = sorted(actual_columns - expected_columns)
        if missing_cols:
            missing[table] = missing_cols
        if extra_cols:
            extra[table] = extra_cols
    return {
        "ok": True,
        "tables": sorted(SCHEMA_EXPECTATIONS.keys()),
        "missing": missing,
        "extra": extra,
        "actual": {table: sorted(cols) for table, cols in actual.items()},
        "expected": {table: sorted(cols) for table, cols in SCHEMA_EXPECTATIONS.items()},
    }


@router.get("/profiles")
def get_profiles(user: AuthUser = Depends(require_admin)):
    return list_profiles()


@router.patch("/profiles/{profile_id}")
def set_profile_role(profile_id: str, payload: dict, user: AuthUser = Depends(require_admin)):
    role = payload.get("role") or "viewer"
    result = update_profile_role(profile_id, role)
    insert_audit_log(
        actor_id=user.id,
        action="profile.role_updated",
        entity_type="profile",
        entity_id=profile_id,
        metadata={"role": role, "actor_role": user.role},
    )
    return result


@router.get("/bootstrap")
def get_bootstrap_state(user: AuthUser = Depends(require_admin)):
    return {
        "owners": count_profiles_by_role("owner"),
        "admins": count_profiles_by_role("admin"),
    }


@router.post("/invite")
def invite_user(payload: InvitePayload, user: AuthUser = Depends(require_admin)):
    client = get_supabase_client()
    try:
        invite_result = client.auth.admin.invite_user_by_email(
            payload.email,
            {
                "data": {
                    "full_name": payload.full_name or payload.email,
                    "role": payload.role,
                }
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invite failed: {exc}") from exc
    user_obj = getattr(invite_result, "user", None) or invite_result.get("user")
    if user_obj:
        user_id = getattr(user_obj, "id", None) or user_obj.get("id")
        if user_id:
            client.table("profiles").upsert(
                {
                    "id": user_id,
                    "full_name": payload.full_name or payload.email,
                    "role": payload.role,
                }
            ).execute()
    insert_audit_log(
        actor_id=user.id,
        action="profile.invited",
        entity_type="profile",
        entity_id=payload.email,
        metadata={"role": payload.role, "full_name": payload.full_name or payload.email, "actor_role": user.role},
    )
    return {"ok": True, "email": payload.email, "role": payload.role}
