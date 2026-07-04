from pydantic import BaseModel


class EntityResponse(BaseModel):
    id: str


class DeleteResponse(BaseModel):
    ok: bool = True

