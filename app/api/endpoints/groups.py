from fastapi import APIRouter

from app.repositories.content_repo import delete_row, insert_row, list_rows_filtered, update_row
from app.schemas.groups import GroupCreate, GroupUpdate
from app.schemas.responses import DeleteResponse, EntityResponse
from app.services.scheduler_service import build_group_auto_status, enqueue_group_auto_now

router = APIRouter()


@router.get("")
def list_groups(q: str | None = None, limit: int = 50, offset: int = 0):
    search = ("name", q) if q else None
    return list_rows_filtered("content_groups", order="-created_at", search=search, limit=limit, offset=offset)


@router.post("", response_model=EntityResponse)
def create_group(payload: GroupCreate):
    row = insert_row("content_groups", payload.model_dump())
    return {"id": row["id"]}


@router.patch("/{group_id}", response_model=EntityResponse)
def update_group(group_id: str, payload: GroupUpdate):
    row = update_row("content_groups", group_id, payload.model_dump(exclude_none=True))
    return {"id": row["id"]}


@router.delete("/{group_id}", response_model=DeleteResponse)
def delete_group(group_id: str):
    delete_row("content_groups", group_id)
    return {"ok": True}


@router.get("/{group_id}/auto/status")
def get_group_auto_status(group_id: str):
    return build_group_auto_status(group_id)


@router.post("/{group_id}/auto/run")
def run_group_auto_now(group_id: str):
    return enqueue_group_auto_now(group_id)
