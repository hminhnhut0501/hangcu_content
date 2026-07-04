from fastapi import APIRouter

from app.repositories.content_repo import delete_row, insert_row, list_rows_filtered, update_row
from app.schemas.topics import TopicCreate, TopicUpdate
from app.schemas.responses import DeleteResponse, EntityResponse

router = APIRouter()


@router.get("")
def list_topics(group_id: str | None = None, q: str | None = None, limit: int = 50, offset: int = 0):
    filters = {"group_id": group_id} if group_id else None
    search = ("name", q) if q else None
    return list_rows_filtered("content_topics", filters=filters, order="sort_order", search=search, limit=limit, offset=offset)


@router.post("/groups/{group_id}", response_model=EntityResponse)
def create_topic(group_id: str, payload: TopicCreate):
    data = payload.model_dump()
    data["group_id"] = group_id
    row = insert_row("content_topics", data)
    return {"id": row["id"]}


@router.patch("/{topic_id}", response_model=EntityResponse)
def update_topic(topic_id: str, payload: TopicUpdate):
    row = update_row("content_topics", topic_id, payload.model_dump(exclude_none=True))
    return {"id": row["id"]}


@router.delete("/{topic_id}", response_model=DeleteResponse)
def delete_topic(topic_id: str):
    delete_row("content_topics", topic_id)
    return {"ok": True}
