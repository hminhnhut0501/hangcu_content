from __future__ import annotations

from typing import Any

import psycopg

from app.core.config import settings


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


def _db_url() -> str:
    return settings.supabase_db_url or ""


def get_real_schema() -> dict[str, set[str]]:
    db_url = _db_url()
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


def build_schema_reconcile() -> dict[str, Any]:
    actual = get_real_schema()
    missing: dict[str, list[str]] = {}
    extra: dict[str, list[str]] = {}
    suggestions: list[dict[str, str]] = []
    for table, expected_columns in SCHEMA_EXPECTATIONS.items():
        actual_columns = actual.get(table, set())
        missing_cols = sorted(expected_columns - actual_columns)
        extra_cols = sorted(actual_columns - expected_columns)
        if missing_cols:
            missing[table] = missing_cols
            for column in missing_cols:
                suggestions.append(
                    {
                        "table": table,
                        "column": column,
                        "sql": _suggest_column_sql(table, column),
                    }
                )
        if extra_cols:
            extra[table] = extra_cols
    return {
        "ok": True,
        "tables": sorted(SCHEMA_EXPECTATIONS.keys()),
        "missing": missing,
        "extra": extra,
        "actual": {table: sorted(cols) for table, cols in actual.items()},
        "expected": {table: sorted(cols) for table, cols in SCHEMA_EXPECTATIONS.items()},
        "suggested_migrations": suggestions,
    }


def _suggest_column_sql(table: str, column: str) -> str:
    column_sql = {
        "risk_reason": f"alter table if exists {table} add column if not exists {column} text;",
        "risk_status": f"alter table if exists {table} add column if not exists {column} text not null default 'active';",
        "last_error": f"alter table if exists {table} add column if not exists {column} text;",
        "last_checked_at": f"alter table if exists {table} add column if not exists {column} timestamptz;",
        "daily_job_limit": f"alter table if exists {table} add column if not exists {column} int not null default 30;",
        "daily_job_count": f"alter table if exists {table} add column if not exists {column} int not null default 0;",
        "daily_job_reset_at": f"alter table if exists {table} add column if not exists {column} timestamptz;",
    }
    return column_sql.get(column, f"alter table if exists {table} add column if not exists {column} text;")
