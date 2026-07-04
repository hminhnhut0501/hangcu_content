from pydantic import BaseModel, Field


class TopicCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    source_topic_id: int | None = None
    target_topic_id: int | None = None
    target_link_seed: str | None = None
    sort_order: int = 0


class TopicUpdate(BaseModel):
    name: str | None = None
    source_topic_id: int | None = None
    target_topic_id: int | None = None
    target_link_seed: str | None = None
    sort_order: int | None = None
    status: str | None = None

