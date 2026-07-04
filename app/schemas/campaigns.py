from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    source_start_link: str | None = None
    source_end_link: str | None = None
    follow_latest: bool = True
    target_link: str | None = None
    caption: str | None = None
    group_mode: str = "keep"
    order_mode: str = "auto"
    batch_size: int = 1
    delay_min: int = 1
    delay_max: int = 7
    schedule_enabled: bool = False
    schedule_slots: str = ""


class CampaignUpdate(BaseModel):
    title: str | None = None
    source_start_link: str | None = None
    source_end_link: str | None = None
    follow_latest: bool | None = None
    target_link: str | None = None
    caption: str | None = None
    group_mode: str | None = None
    order_mode: str | None = None
    batch_size: int | None = None
    delay_min: int | None = None
    delay_max: int | None = None
    enabled: bool | None = None
    status: str | None = None
    schedule_enabled: bool | None = None
    schedule_slots: str | None = None
