from __future__ import annotations

import os
from datetime import datetime, timezone

from app.repositories.system_repo import update_account

try:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
except Exception:  # pragma: no cover
    TelegramClient = None
    StringSession = None


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def test_account_connection(account: dict) -> dict:
    account_id = account.get("id")
    api_id = account.get("api_id") or os.getenv("TG_API_ID")
    api_hash = account.get("api_hash") or os.getenv("TG_API_HASH")
    session_ref = account.get("session_ref") or os.getenv("TG_STRING_SESSION")

    if not api_id or not api_hash:
        result = {
            "ok": False,
            "status": "missing_credentials",
            "message": "Thiếu TG API credentials",
        }
        update_account(str(account_id), {"status": result["status"], "last_checked_at": utc_now_iso(), "last_error": result["message"]})
        return result

    if TelegramClient is None or StringSession is None:
        result = {
            "ok": False,
            "status": "telethon_unavailable",
            "message": "Telethon chưa sẵn sàng trong môi trường chạy",
        }
        update_account(str(account_id), {"status": result["status"], "last_checked_at": utc_now_iso(), "last_error": result["message"]})
        return result

    client = None
    try:
        if session_ref and str(session_ref).startswith("1"):
            client = TelegramClient(StringSession(str(session_ref)), int(api_id), str(api_hash))
        else:
            client = TelegramClient(str(session_ref or f"/tmp/{account_id}.session"), int(api_id), str(api_hash))
        await client.connect()
        me = await client.get_me()
        status = "active" if me else "unverified"
        result = {
            "ok": bool(me),
            "status": status,
            "message": f"Connected as {getattr(me, 'username', None) or getattr(me, 'id', 'unknown')}",
        }
        update_account(
            str(account_id),
            {
                "status": status,
                "last_checked_at": utc_now_iso(),
                "last_error": "" if result["ok"] else result["message"],
            },
        )
        return result
    except Exception as exc:
        result = {"ok": False, "status": "error", "message": str(exc)}
        update_account(str(account_id), {"status": "error", "last_checked_at": utc_now_iso(), "last_error": str(exc)})
        return result
    finally:
        if client is not None:
            try:
                await client.disconnect()
            except Exception:
                pass


def build_telegram_client(account: dict):
    account_id = account.get("id")
    api_id = account.get("api_id") or os.getenv("TG_API_ID")
    api_hash = account.get("api_hash") or os.getenv("TG_API_HASH")
    session_ref = account.get("session_ref") or os.getenv("TG_STRING_SESSION")

    if TelegramClient is None or StringSession is None:
        raise RuntimeError("Telethon unavailable")
    if not api_id or not api_hash:
        raise RuntimeError("Missing TG credentials")

    if session_ref and str(session_ref).startswith("1"):
        return TelegramClient(StringSession(str(session_ref)), int(api_id), str(api_hash))
    return TelegramClient(str(session_ref or f"/tmp/{account_id}.session"), int(api_id), str(api_hash))
