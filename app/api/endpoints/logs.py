from fastapi import APIRouter

from app.repositories.system_repo import list_logs

router = APIRouter()


@router.get("")
def list_logs_api(entity_type: str | None = None, entity_id: str | None = None, level: str | None = None, limit: int = 100, q: str | None = None):
    return list_logs(entity_type=entity_type, entity_id=entity_id, level=level, limit=limit, q=q)
