from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.services.scheduler_service import enqueue_due_work
from app.repositories.content_repo import count_rows
from app.repositories.system_repo import list_accounts, list_logs, list_settings, recent_jobs
from app.core.auth import require_user, require_admin
from app.services.schema_service import build_schema_reconcile

router = APIRouter()


def _setting_map() -> dict[str, object]:
    items = list_settings()
    return {str(item.get("key")): item.get("value") for item in items if item.get("key")}


def build_health_snapshot() -> dict:
    settings_map = _setting_map()
    worker_heartbeat = settings_map.get("worker_heartbeat") or {}
    scheduler_heartbeat = settings_map.get("scheduler_heartbeat") or {}
    return {
        "ok": True,
        "ts": datetime.now(timezone.utc).isoformat(),
        "worker": worker_heartbeat,
        "scheduler": scheduler_heartbeat,
        "counts": {
            "groups": count_rows("content_groups"),
            "topics": count_rows("content_topics"),
            "campaigns": count_rows("content_campaigns"),
            "accounts": count_rows("tg_accounts"),
            "pending_jobs": count_rows("queue_jobs", filters={"status": "pending"}),
            "running_jobs": count_rows("queue_jobs", filters={"status": "running"}),
            "recent_events": len(list_logs(limit=5)),
            "recent_jobs": len(recent_jobs(5)),
        },
    }


def build_health_deep_snapshot() -> dict:
    snapshot = build_health_snapshot()
    accounts = list_accounts()
    safe_accounts = []
    for account in accounts:
        risk_status = str(account.get("risk_status") or "active").strip().lower()
        is_active = bool(account.get("is_active", True))
        safe_accounts.append(
            {
                "id": account.get("id"),
                "name": account.get("name"),
                "is_active": is_active,
                "risk_status": risk_status,
                "risk_reason": account.get("risk_reason") or "",
                "daily_job_limit": account.get("daily_job_limit"),
                "daily_job_count": account.get("daily_job_count"),
                "safe": is_active and risk_status == "active",
            }
        )
    snapshot["recent"] = {
        "logs": list_logs(limit=10),
        "jobs": recent_jobs(10),
    }
    snapshot["accounts"] = safe_accounts
    snapshot["safety"] = {
        "active_accounts": sum(1 for account in safe_accounts if account["safe"]),
        "paused_accounts": sum(1 for account in safe_accounts if not account["safe"]),
        "risky_accounts": sum(1 for account in safe_accounts if account["risk_status"] not in ("", "active", "paused")),
        "daily_limit_exceeded": sum(
            1
            for account in safe_accounts
            if int(account.get("daily_job_limit") or 0) > 0
            and int(account.get("daily_job_count") or 0) >= int(account.get("daily_job_limit") or 0)
        ),
    }
    return snapshot


@router.post("/scheduler/tick", dependencies=[Depends(require_admin)])
def scheduler_tick():
    return enqueue_due_work()


@router.get("/health", dependencies=[Depends(require_user)])
def health():
    return build_health_snapshot()


@router.get("/health/deep", dependencies=[Depends(require_admin)])
def health_deep():
    return build_health_deep_snapshot()


@router.get("/schema/reconcile", dependencies=[Depends(require_user)])
def schema_reconcile():
    return build_schema_reconcile()
