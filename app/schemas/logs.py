from pydantic import BaseModel


class LogItem(BaseModel):
    id: int
    group_id: str | None = None
    topic_id: str | None = None
    campaign_id: str | None = None
    level: str
    code: str
    message: str
    payload: object | None = None
    created_at: str

