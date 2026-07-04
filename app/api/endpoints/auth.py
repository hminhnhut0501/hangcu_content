from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import AUTH_COOKIE_NAME, AuthUser, get_current_user_optional, require_user
from app.core.db import get_supabase_client
from app.schemas.common import StatusResponse
from app.core.config import settings
from app.schemas.auth import LoginPayload
from app.repositories.system_repo import count_profiles_by_role, insert_audit_log

router = APIRouter()


@router.get("/me")
def me(user: AuthUser | None = Depends(get_current_user_optional)):
    if not user:
        return {"user": None}
    return {"user": user.__dict__}


@router.post("/login")
def login(payload: LoginPayload, response: Response):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email")
    auth_result = get_supabase_client().auth.sign_in_with_password({"email": email, "password": payload.password})
    session = getattr(auth_result, "session", None) or auth_result.get("session")
    user = getattr(auth_result, "user", None) or auth_result.get("user")
    if not session or not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    user_id = getattr(user, "id", None) or user.get("id")
    profile = (
        get_supabase_client()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not profile:
        full_name = getattr(user, "user_metadata", None) or user.get("user_metadata") or {}
        get_supabase_client().table("profiles").insert(
            {
                "id": user_id,
                "full_name": full_name.get("full_name") or full_name.get("name") or email,
                "role": "viewer",
            }
        ).execute()
    cookie_value = json.dumps(
        {
            "access_token": session.access_token if hasattr(session, "access_token") else session["access_token"],
            "refresh_token": session.refresh_token if hasattr(session, "refresh_token") else session["refresh_token"],
        }
    )
    response.set_cookie(
        AUTH_COOKIE_NAME,
        cookie_value,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        max_age=60 * 60 * 24 * 14,
        path="/",
    )
    role = (profile[0].get("role") if profile else "viewer") or "viewer"
    full_name = (profile[0].get("full_name") if profile else None) or email
    insert_audit_log(
        actor_id=user_id,
        action="auth.login",
        entity_type="profile",
        entity_id=user_id,
        metadata={"email": email, "role": role},
    )
    return {"ok": True, "user": {"id": user_id, "email": email, "role": role, "full_name": full_name}}


@router.post("/logout", response_model=StatusResponse)
def logout(response: Response, user: AuthUser = Depends(require_user)):
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")
    insert_audit_log(
        actor_id=user.id,
        action="auth.logout",
        entity_type="profile",
        entity_id=user.id,
        metadata={"role": user.role},
    )
    return {"ok": True}


@router.get("/bootstrap")
def bootstrap_status():
    return {
        "owners": count_profiles_by_role("owner"),
        "admins": count_profiles_by_role("admin"),
        "can_bootstrap": count_profiles_by_role("owner") == 0,
    }
