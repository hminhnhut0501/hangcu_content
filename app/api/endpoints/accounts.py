from fastapi import APIRouter

from app.repositories.content_repo import create_event
from app.repositories.system_repo import (
    create_account as repo_create_account,
    delete_account as repo_delete_account,
    get_account_by_id,
    list_accounts as repo_list_accounts,
    normalize_account_quota as repo_normalize_account_quota,
    update_account as repo_update_account,
    resume_account as repo_resume_account,
)
from app.schemas.accounts import AccountCreate, AccountUpdate
from app.schemas.common import StatusResponse
from app.services.account_service import test_account_connection

router = APIRouter()


@router.get("")
def list_accounts():
    return repo_list_accounts()


@router.post("")
def create_account_api(payload: AccountCreate):
    row = repo_create_account(payload.model_dump(exclude_none=True))
    return {"ok": bool(row), "row": row}


@router.patch("/{account_id}")
def update_account_api(account_id: str, payload: AccountUpdate):
    row = repo_update_account(account_id, payload.model_dump(exclude_none=True))
    return {"ok": bool(row), "row": row}


@router.post("/{account_id}/normalize-quota")
def normalize_quota_api(account_id: str):
    row = repo_normalize_account_quota(account_id, default_limit=30)
    return {"ok": bool(row), "row": row}


@router.delete("/{account_id}", response_model=StatusResponse)
def delete_account_api(account_id: str):
    repo_delete_account(account_id)
    return {"ok": True}


@router.post("/{account_id}/test")
async def test_account_api(account_id: str):
    account = get_account_by_id(account_id)
    if not account:
        return {"ok": False, "status": "not_found", "message": "Account not found"}
    result = await test_account_connection(account)
    create_event(
        "info" if result.get("ok") else "error",
        "account_test",
        result.get("message", ""),
        {"account_id": account_id, **result},
    )
    return result


@router.post("/{account_id}/resume", response_model=StatusResponse)
def resume_account_api(account_id: str):
    row = repo_resume_account(account_id)
    if not row:
        return {"ok": False}
    create_event(
        "info",
        "account_resumed",
        "Telegram account resumed manually",
        {"account_id": account_id},
    )
    return {"ok": True}


@router.post("/{account_id}/pause", response_model=StatusResponse)
def pause_account_api(account_id: str, reason: str = "manual_pause"):
    row = repo_update_account(
        account_id,
        {
            "is_active": False,
            "risk_status": "paused",
            "risk_reason": reason,
        },
    )
    if not row:
        return {"ok": False}
    create_event(
        "warning",
        "account_paused",
        "Telegram account paused manually",
        {"account_id": account_id, "reason": reason},
    )
    return {"ok": True}
