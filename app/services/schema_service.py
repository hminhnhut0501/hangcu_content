from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from functools import lru_cache

try:  # pragma: no cover - depends on local shell env
    import psycopg
except Exception:  # pragma: no cover
    psycopg = None

from app.core.config import settings


CANONICAL_TABLE_ALIASES: dict[str, str] = {
    "projects": "content_groups",
    "topics": "content_topics",
    "campaign_children": "content_campaigns",
    "runs": "campaign_runs",
    "logs": "content_events",
}

TABLE_ALIAS_TO_CANONICAL = {physical: canonical for canonical, physical in CANONICAL_TABLE_ALIASES.items()}


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

CANONICAL_SCHEMA_EXPECTATIONS: dict[str, set[str]] = {
    "projects": SCHEMA_EXPECTATIONS["content_groups"],
    "topics": SCHEMA_EXPECTATIONS["content_topics"],
    "campaign_children": SCHEMA_EXPECTATIONS["content_campaigns"],
    "runs": SCHEMA_EXPECTATIONS["campaign_runs"],
    "logs": SCHEMA_EXPECTATIONS["content_events"],
}

CANONICAL_COLUMN_SQL_TYPES: dict[tuple[str, str], str] = {
    ("projects", "id"): "uuid primary key default gen_random_uuid()",
    ("projects", "name"): "text not null",
    ("projects", "source_key"): "text",
    ("projects", "source_link"): "text",
    ("projects", "target_link"): "text",
    ("projects", "auto_enabled"): "boolean not null default false",
    ("projects", "auto_slots"): "text not null default ''",
    ("projects", "auto_pick_count"): "int not null default 1",
    ("projects", "auto_strategy"): "text not null default 'round_robin'",
    ("projects", "auto_next_run_at"): "timestamptz",
    ("projects", "auto_last_run_at"): "timestamptz",
    ("projects", "auto_last_slot_key"): "text",
    ("projects", "auto_last_result"): "text",
    ("projects", "auto_last_error"): "text",
    ("projects", "status"): "text not null default 'active'",
    ("projects", "created_at"): "timestamptz not null default now()",
    ("projects", "updated_at"): "timestamptz not null default now()",
    ("topics", "id"): "uuid primary key default gen_random_uuid()",
    ("topics", "group_id"): "uuid not null references content_groups(id) on delete cascade",
    ("topics", "name"): "text not null",
    ("topics", "source_topic_id"): "bigint",
    ("topics", "target_topic_id"): "bigint",
    ("topics", "target_link_seed"): "text",
    ("topics", "last_msg_id"): "bigint not null default 0",
    ("topics", "sort_order"): "int not null default 0",
    ("topics", "status"): "text not null default 'active'",
    ("topics", "created_at"): "timestamptz not null default now()",
    ("topics", "updated_at"): "timestamptz not null default now()",
    ("campaign_children", "id"): "uuid primary key default gen_random_uuid()",
    ("campaign_children", "group_id"): "uuid not null references content_groups(id) on delete cascade",
    ("campaign_children", "topic_id"): "uuid not null references content_topics(id) on delete cascade",
    ("campaign_children", "title"): "text not null",
    ("campaign_children", "source_start_link"): "text",
    ("campaign_children", "source_end_link"): "text",
    ("campaign_children", "follow_latest"): "boolean not null default true",
    ("campaign_children", "target_link"): "text",
    ("campaign_children", "caption"): "text",
    ("campaign_children", "group_mode"): "text not null default 'keep'",
    ("campaign_children", "order_mode"): "text not null default 'auto'",
    ("campaign_children", "batch_size"): "int not null default 1",
    ("campaign_children", "delay_min"): "int not null default 1",
    ("campaign_children", "delay_max"): "int not null default 7",
    ("campaign_children", "enabled"): "boolean not null default true",
    ("campaign_children", "status"): "text not null default 'draft'",
    ("campaign_children", "schedule_enabled"): "boolean not null default false",
    ("campaign_children", "schedule_slots"): "text not null default ''",
    ("campaign_children", "next_run_at"): "timestamptz",
    ("campaign_children", "last_run_at"): "timestamptz",
    ("campaign_children", "last_result"): "text",
    ("campaign_children", "last_msg_id"): "bigint not null default 0",
    ("campaign_children", "sent_count"): "int not null default 0",
    ("campaign_children", "sent_units_count"): "int not null default 0",
    ("campaign_children", "created_at"): "timestamptz not null default now()",
    ("campaign_children", "updated_at"): "timestamptz not null default now()",
    ("runs", "id"): "uuid primary key default gen_random_uuid()",
    ("runs", "campaign_id"): "uuid not null references content_campaigns(id) on delete cascade",
    ("runs", "slot_key"): "text not null",
    ("runs", "scheduled_at"): "timestamptz",
    ("runs", "status"): "text not null default 'pending'",
    ("runs", "selected_topic_ids"): "jsonb",
    ("runs", "queued_items"): "int not null default 0",
    ("runs", "started_at"): "timestamptz",
    ("runs", "finished_at"): "timestamptz",
    ("runs", "last_error"): "text",
    ("runs", "created_at"): "timestamptz not null default now()",
    ("runs", "updated_at"): "timestamptz not null default now()",
    ("logs", "id"): "bigserial primary key",
    ("logs", "group_id"): "uuid",
    ("logs", "topic_id"): "uuid",
    ("logs", "campaign_id"): "uuid",
    ("logs", "level"): "text not null default 'info'",
    ("logs", "code"): "text not null default ''",
    ("logs", "message"): "text not null default ''",
    ("logs", "payload"): "jsonb",
    ("logs", "created_at"): "timestamptz not null default now()",
}

COLUMN_SQL_TYPES: dict[tuple[str, str], str] = {
    ("tg_accounts", "id"): "uuid primary key default gen_random_uuid()",
    ("tg_accounts", "name"): "text not null",
    ("tg_accounts", "api_id"): "bigint",
    ("tg_accounts", "api_hash"): "text",
    ("tg_accounts", "phone"): "text",
    ("tg_accounts", "session_ref"): "text",
    ("tg_accounts", "is_active"): "boolean not null default false",
    ("tg_accounts", "status"): "text not null default 'unverified'",
    ("tg_accounts", "last_checked_at"): "timestamptz",
    ("tg_accounts", "last_error"): "text",
    ("tg_accounts", "daily_job_limit"): "int not null default 30",
    ("tg_accounts", "daily_job_count"): "int not null default 0",
    ("tg_accounts", "daily_job_reset_at"): "timestamptz",
    ("tg_accounts", "created_at"): "timestamptz not null default now()",
    ("tg_accounts", "updated_at"): "timestamptz not null default now()",
    ("queue_jobs", "id"): "uuid primary key default gen_random_uuid()",
    ("queue_jobs", "job_type"): "text not null",
    ("queue_jobs", "group_id"): "uuid",
    ("queue_jobs", "topic_id"): "uuid",
    ("queue_jobs", "campaign_id"): "uuid",
    ("queue_jobs", "account_id"): "uuid references tg_accounts(id) on delete set null",
    ("queue_jobs", "priority"): "int not null default 100",
    ("queue_jobs", "status"): "text not null default 'pending'",
    ("queue_jobs", "scheduled_at"): "timestamptz",
    ("queue_jobs", "started_at"): "timestamptz",
    ("queue_jobs", "finished_at"): "timestamptz",
    ("queue_jobs", "attempts"): "int not null default 0",
    ("queue_jobs", "max_attempts"): "int not null default 3",
    ("queue_jobs", "locked_by"): "text",
    ("queue_jobs", "locked_at"): "timestamptz",
    ("queue_jobs", "lock_expires_at"): "timestamptz",
    ("queue_jobs", "next_retry_at"): "timestamptz",
    ("queue_jobs", "last_error"): "text",
    ("queue_jobs", "payload"): "jsonb",
    ("queue_jobs", "result"): "jsonb",
    ("queue_jobs", "created_at"): "timestamptz not null default now()",
    ("queue_jobs", "updated_at"): "timestamptz not null default now()",
    ("content_groups", "id"): "uuid primary key default gen_random_uuid()",
    ("content_groups", "name"): "text not null",
    ("content_groups", "source_key"): "text",
    ("content_groups", "source_link"): "text",
    ("content_groups", "target_link"): "text",
    ("content_groups", "auto_enabled"): "boolean not null default false",
    ("content_groups", "auto_slots"): "text not null default ''",
    ("content_groups", "auto_pick_count"): "int not null default 1",
    ("content_groups", "auto_strategy"): "text not null default 'round_robin'",
    ("content_groups", "auto_next_run_at"): "timestamptz",
    ("content_groups", "auto_last_run_at"): "timestamptz",
    ("content_groups", "auto_last_slot_key"): "text",
    ("content_groups", "auto_last_result"): "text",
    ("content_groups", "auto_last_error"): "text",
    ("content_groups", "status"): "text not null default 'active'",
    ("content_groups", "created_at"): "timestamptz not null default now()",
    ("content_groups", "updated_at"): "timestamptz not null default now()",
    ("content_topics", "id"): "uuid primary key default gen_random_uuid()",
    ("content_topics", "group_id"): "uuid not null references content_groups(id) on delete cascade",
    ("content_topics", "name"): "text not null",
    ("content_topics", "source_topic_id"): "bigint",
    ("content_topics", "target_topic_id"): "bigint",
    ("content_topics", "target_link_seed"): "text",
    ("content_topics", "last_msg_id"): "bigint not null default 0",
    ("content_topics", "sort_order"): "int not null default 0",
    ("content_topics", "status"): "text not null default 'active'",
    ("content_topics", "created_at"): "timestamptz not null default now()",
    ("content_topics", "updated_at"): "timestamptz not null default now()",
    ("content_campaigns", "id"): "uuid primary key default gen_random_uuid()",
    ("content_campaigns", "group_id"): "uuid not null references content_groups(id) on delete cascade",
    ("content_campaigns", "topic_id"): "uuid not null references content_topics(id) on delete cascade",
    ("content_campaigns", "title"): "text not null",
    ("content_campaigns", "source_start_link"): "text",
    ("content_campaigns", "source_end_link"): "text",
    ("content_campaigns", "follow_latest"): "boolean not null default true",
    ("content_campaigns", "target_link"): "text",
    ("content_campaigns", "caption"): "text",
    ("content_campaigns", "group_mode"): "text not null default 'keep'",
    ("content_campaigns", "order_mode"): "text not null default 'auto'",
    ("content_campaigns", "batch_size"): "int not null default 1",
    ("content_campaigns", "delay_min"): "int not null default 1",
    ("content_campaigns", "delay_max"): "int not null default 7",
    ("content_campaigns", "enabled"): "boolean not null default true",
    ("content_campaigns", "status"): "text not null default 'draft'",
    ("content_campaigns", "schedule_enabled"): "boolean not null default false",
    ("content_campaigns", "schedule_slots"): "text not null default ''",
    ("content_campaigns", "next_run_at"): "timestamptz",
    ("content_campaigns", "last_run_at"): "timestamptz",
    ("content_campaigns", "last_result"): "text",
    ("content_campaigns", "last_msg_id"): "bigint not null default 0",
    ("content_campaigns", "sent_count"): "int not null default 0",
    ("content_campaigns", "sent_units_count"): "int not null default 0",
    ("content_campaigns", "created_at"): "timestamptz not null default now()",
    ("content_campaigns", "updated_at"): "timestamptz not null default now()",
    ("campaign_runs", "id"): "uuid primary key default gen_random_uuid()",
    ("campaign_runs", "campaign_id"): "uuid not null references content_campaigns(id) on delete cascade",
    ("campaign_runs", "slot_key"): "text not null",
    ("campaign_runs", "scheduled_at"): "timestamptz",
    ("campaign_runs", "status"): "text not null default 'pending'",
    ("campaign_runs", "selected_topic_ids"): "jsonb",
    ("campaign_runs", "queued_items"): "int not null default 0",
    ("campaign_runs", "started_at"): "timestamptz",
    ("campaign_runs", "finished_at"): "timestamptz",
    ("campaign_runs", "last_error"): "text",
    ("campaign_runs", "created_at"): "timestamptz not null default now()",
    ("campaign_runs", "updated_at"): "timestamptz not null default now()",
    ("content_events", "id"): "bigserial primary key",
    ("content_events", "group_id"): "uuid",
    ("content_events", "topic_id"): "uuid",
    ("content_events", "campaign_id"): "uuid",
    ("content_events", "level"): "text not null default 'info'",
    ("content_events", "code"): "text not null default ''",
    ("content_events", "message"): "text not null default ''",
    ("content_events", "payload"): "jsonb",
    ("content_events", "created_at"): "timestamptz not null default now()",
    ("settings", "key"): "text primary key",
    ("settings", "value"): "jsonb not null",
    ("settings", "updated_at"): "timestamptz not null default now()",
    ("profiles", "id"): "uuid primary key references auth.users(id) on delete cascade",
    ("profiles", "full_name"): "text",
    ("profiles", "role"): "text not null default 'owner'",
    ("profiles", "created_at"): "timestamptz not null default now()",
    ("profiles", "updated_at"): "timestamptz not null default now()",
    ("audit_logs", "id"): "bigserial primary key",
    ("audit_logs", "actor_id"): "uuid references auth.users(id)",
    ("audit_logs", "action"): "text not null",
    ("audit_logs", "entity_type"): "text not null",
    ("audit_logs", "entity_id"): "text",
    ("audit_logs", "metadata"): "jsonb",
    ("audit_logs", "created_at"): "timestamptz not null default now()",
}

_LAST_SCHEMA_RECONCILE: dict[str, Any] = {
    "ok": False,
    "checked_at": None,
    "db_configured": bool(settings.supabase_db_url),
    "missing_tables": 0,
    "missing_columns": 0,
    "extra_columns": 0,
    "canonical_missing_tables": 0,
    "canonical_missing_columns": 0,
    "canonical_extra_columns": 0,
}


def _db_url() -> str:
    return settings.supabase_db_url or ""


def resolve_table_name(table: str) -> str:
    return CANONICAL_TABLE_ALIASES.get(table, table)


def canonical_table_name(table: str) -> str:
    return TABLE_ALIAS_TO_CANONICAL.get(table, table)


def get_real_schema(tables: list[str] | None = None) -> dict[str, set[str]]:
    db_url = _db_url()
    if not db_url:
        return {}
    if psycopg is None:
        raise RuntimeError("psycopg is required to read schema from Supabase")
    requested_tables = tables or list(SCHEMA_EXPECTATIONS.keys())
    physical_tables = [resolve_table_name(table) for table in requested_tables]
    try:
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
                    (physical_tables,),
                )
                schema: dict[str, set[str]] = {table: set() for table in physical_tables}
                for table_name, column_name in cur.fetchall():
                    schema.setdefault(table_name, set()).add(column_name)
                return schema
    except Exception:
        return {}


@lru_cache(maxsize=1)
def get_real_schema_cached() -> dict[str, set[str]]:
    return get_real_schema()


def has_column(table: str, column: str) -> bool:
    return column in get_real_schema_cached().get(resolve_table_name(table), set())


def build_schema_reconcile() -> dict[str, Any]:
    actual = get_real_schema()
    if not actual:
        report = {
            "ok": False,
            "error": "schema_unavailable",
            "tables": sorted(SCHEMA_EXPECTATIONS.keys()),
            "canonical_tables": sorted(CANONICAL_SCHEMA_EXPECTATIONS.keys()),
            "missing": {},
            "extra": {},
            "actual": {},
            "expected": {table: sorted(cols) for table, cols in SCHEMA_EXPECTATIONS.items()},
            "suggested_migrations": [],
            "canonical_missing": {},
            "canonical_extra": {},
            "canonical_actual": {},
            "canonical_expected": {table: sorted(cols) for table, cols in CANONICAL_SCHEMA_EXPECTATIONS.items()},
            "canonical_suggested_migrations": [],
        }
        _LAST_SCHEMA_RECONCILE.update(
            {
                "ok": False,
                "checked_at": None,
                "db_configured": bool(settings.supabase_db_url),
                "missing_tables": 0,
                "missing_columns": 0,
                "extra_columns": 0,
                "canonical_missing_tables": 0,
                "canonical_missing_columns": 0,
                "canonical_extra_columns": 0,
            }
        )
        return report
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
    report = {
        "ok": True,
        "tables": sorted(SCHEMA_EXPECTATIONS.keys()),
        "canonical_tables": sorted(CANONICAL_SCHEMA_EXPECTATIONS.keys()),
        "missing": missing,
        "extra": extra,
        "actual": {table: sorted(cols) for table, cols in actual.items()},
        "expected": {table: sorted(cols) for table, cols in SCHEMA_EXPECTATIONS.items()},
        "suggested_migrations": suggestions,
        "canonical_missing": {},
        "canonical_extra": {},
        "canonical_actual": {},
        "canonical_expected": {table: sorted(cols) for table, cols in CANONICAL_SCHEMA_EXPECTATIONS.items()},
        "canonical_suggested_migrations": [],
    }
    canonical_missing: dict[str, list[str]] = {}
    canonical_extra: dict[str, list[str]] = {}
    canonical_suggestions: list[dict[str, str]] = []
    for table, expected_columns in CANONICAL_SCHEMA_EXPECTATIONS.items():
        physical_table = resolve_table_name(table)
        actual_columns = actual.get(physical_table, set())
        missing_cols = sorted(expected_columns - actual_columns)
        extra_cols = sorted(actual_columns - expected_columns)
        if missing_cols:
            canonical_missing[table] = missing_cols
            for column in missing_cols:
                canonical_suggestions.append(
                    {
                        "table": table,
                        "column": column,
                        "physical_table": physical_table,
                        "sql": _suggest_column_sql(table, column),
                    }
                )
        if extra_cols:
            canonical_extra[table] = extra_cols
    report["canonical_missing"] = canonical_missing
    report["canonical_extra"] = canonical_extra
    report["canonical_actual"] = {
        table: sorted(actual.get(resolve_table_name(table), set())) for table in CANONICAL_SCHEMA_EXPECTATIONS
    }
    report["canonical_suggested_migrations"] = canonical_suggestions
    _LAST_SCHEMA_RECONCILE.update(
        {
            "ok": True,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "db_configured": bool(settings.supabase_db_url),
            "missing_tables": len(missing),
            "missing_columns": sum(len(cols) for cols in missing.values()),
            "extra_columns": sum(len(cols) for cols in extra.values()),
            "canonical_missing_tables": len(canonical_missing),
            "canonical_missing_columns": sum(len(cols) for cols in canonical_missing.values()),
            "canonical_extra_columns": sum(len(cols) for cols in canonical_extra.values()),
        }
    )
    return report


def _suggest_column_sql(table: str, column: str) -> str:
    spec = COLUMN_SQL_TYPES.get((table, column)) or CANONICAL_COLUMN_SQL_TYPES.get((table, column), "text")
    return f"alter table if exists {resolve_table_name(table)} add column if not exists {column} {spec};"


def get_schema_reconcile_status() -> dict[str, Any]:
    return dict(_LAST_SCHEMA_RECONCILE)
