from fastapi import APIRouter, Depends

from app.api.endpoints import dashboard, groups, topics, campaigns, logs, settings, accounts, internal, runs, auth, admin
from app.core.auth import require_user, require_admin

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(require_user)])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"], dependencies=[Depends(require_user)])
api_router.include_router(topics.router, prefix="/topics", tags=["topics"], dependencies=[Depends(require_user)])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"], dependencies=[Depends(require_user)])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"], dependencies=[Depends(require_user)])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"], dependencies=[Depends(require_admin)])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"], dependencies=[Depends(require_user)])
api_router.include_router(internal.router, prefix="/internal", tags=["internal"])
api_router.include_router(runs.router, prefix="/runs", tags=["runs"], dependencies=[Depends(require_user)])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
