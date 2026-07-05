from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthUser, require_admin
from app.core.db import get_supabase_client
from app.repositories.system_repo import list_profiles, update_profile_role, count_profiles_by_role, insert_audit_log
from app.schemas.auth import InvitePayload
from app.services.schema_service import build_schema_reconcile

router = APIRouter()
@router.get("/schema/reconcile")
def schema_reconcile(user: AuthUser = Depends(require_admin)):
    return build_schema_reconcile()


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
