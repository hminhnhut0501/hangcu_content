from pydantic import BaseModel, Field


class IdResponse(BaseModel):
    id: str


class StatusResponse(BaseModel):
    ok: bool = True


class MessageResponse(BaseModel):
    ok: bool = True
    message: str = ""
