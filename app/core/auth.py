from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.db import get_supabase_client


AUTH_COOKIE_NAME = "hc_session"
HTTP_BEARER = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None = None
    full_name: str | None = None
    role: str = "viewer"

    @property
    def is_admin(self) -> bool:
        return self.role in {"owner", "admin"}

    @property
    def is_editor(self) -> bool:
        return self.role in {"owner", "admin", "editor"}


def _client():
    return get_supabase_client()


def _decode_session(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def _session_from_cookie(request: Request) -> dict[str, Any] | None:
    return _decode_session(request.cookies.get(AUTH_COOKIE_NAME))


def _session_from_bearer(credentials: HTTPAuthorizationCredentials | None) -> dict[str, Any] | None:
    if not credentials:
        return None
    return {"access_token": credentials.credentials}


def _safe_string(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _fetch_profile(user_id: str) -> dict[str, Any] | None:
    rows = (
        _client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _ensure_profile(user_id: str, email: str | None = None, full_name: str | None = None) -> dict[str, Any]:
    profile = _fetch_profile(user_id)
    if profile:
        return profile
    payload = {"id": user_id, "full_name": full_name or email or "User", "role": "viewer"}
    return (_client().table("profiles").upsert(payload).execute().data or [payload])[0]


def _resolve_user_from_session(session: dict[str, Any] | None) -> AuthUser | None:
    if not session:
        return None
    access_token = session.get("access_token")
    if not access_token:
        return None
    try:
        auth_result = _client().auth.get_user(access_token)
        supa_user = getattr(auth_result, "user", None) or (auth_result.get("user") if isinstance(auth_result, dict) else None)
    except Exception:
        return None
    if not supa_user:
        return None
    user_id = _safe_string(getattr(supa_user, "id", None) or supa_user.get("id"))
    if not user_id:
        return None
    email = _safe_string(getattr(supa_user, "email", None) or supa_user.get("email"))
    user_metadata = getattr(supa_user, "user_metadata", None) or supa_user.get("user_metadata") or {}
    full_name = _safe_string(user_metadata.get("full_name") or user_metadata.get("name"))
    profile = _ensure_profile(user_id, email=email, full_name=full_name)
    return AuthUser(
        id=user_id,
        email=email,
        full_name=profile.get("full_name") or full_name or email,
        role=profile.get("role") or "viewer",
    )


def get_current_user_from_request(request: Request) -> AuthUser | None:
    user = getattr(request.state, "current_user", None)
    if user is not None:
        return user
    session = _session_from_cookie(request) or _session_from_bearer(getattr(request.state, "bearer_credentials", None))
    user = _resolve_user_from_session(session)
    request.state.current_user = user
    return user


def require_user(request: Request) -> AuthUser:
    user = get_current_user_from_request(request)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


def require_role(*allowed_roles: str):
    def dependency(user: AuthUser = Depends(require_user)) -> AuthUser:
        if user.role not in set(allowed_roles) and "owner" not in allowed_roles and user.role != "owner":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency


def require_editor(user: AuthUser = Depends(require_user)) -> AuthUser:
    if not user.is_editor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Editor role required")
    return user


def require_admin(user: AuthUser = Depends(require_user)) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user


def get_current_user_optional(request: Request) -> AuthUser | None:
    return get_current_user_from_request(request)
