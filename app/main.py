import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.api.router import api_router
from app.core.auth import get_current_user_optional
from app.core.config import settings
from app.core.migrations import migrate
from app.core.db import get_supabase_client
from app.repositories.system_repo import insert_audit_log


app = FastAPI(title=settings.app_name)
app.include_router(api_router)
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
def root(request: Request):
    user = get_current_user_optional(request)
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "app_name": settings.app_name,
            "app_env": settings.app_env,
            "current_user": user.__dict__ if user else None,
        },
    )


@app.on_event("startup")
def startup_migrations():
    if settings.supabase_url and settings.supabase_service_role_key and settings.supabase_db_url:
        try:
            migrate()
        except Exception as exc:
            print(f"[startup] migration skipped: {exc}")


@app.on_event("startup")
def startup_bootstrap_owner():
    if not (settings.supabase_url and settings.supabase_service_role_key):
        return
    try:
        client = get_supabase_client()
        owners = (
            client.table("profiles")
            .select("id", count="exact")
            .eq("role", "owner")
            .execute()
            .count
            or 0
        )
        bootstrap_email = getattr(settings, "bootstrap_owner_email", "") or ""
        bootstrap_password = getattr(settings, "bootstrap_owner_password", "") or ""
        if owners == 0 and bootstrap_email and bootstrap_password:
            try:
                result = client.auth.admin.create_user(
                    {
                        "email": bootstrap_email,
                        "password": bootstrap_password,
                        "email_confirm": True,
                        "user_metadata": {"full_name": "Owner"},
                    }
                )
                created = getattr(result, "user", None) or result.get("user")
                if created:
                    user_id = getattr(created, "id", None) or created.get("id")
                    client.table("profiles").upsert(
                        {"id": user_id, "full_name": "Owner", "role": "owner"}
                    ).execute()
                    insert_audit_log(
                        actor_id=user_id,
                        action="bootstrap.owner_created",
                        entity_type="profile",
                        entity_id=user_id,
                        metadata={"email": bootstrap_email},
                    )
            except Exception:
                pass
    except Exception:
        pass
