from pydantic import BaseModel, Field


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    source_key: str | None = None
    source_link: str | None = None
    target_link: str | None = None
    auto_enabled: bool = False
    auto_slots: str = ""
    auto_pick_count: int = 1
    auto_strategy: str = "round_robin"


class GroupUpdate(BaseModel):
    name: str | None = None
    source_key: str | None = None
    source_link: str | None = None
    target_link: str | None = None
    auto_enabled: bool | None = None
    auto_slots: str | None = None
    auto_pick_count: int | None = None
    auto_strategy: str | None = None
    status: str | None = None
