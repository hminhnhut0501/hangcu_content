from pydantic import BaseModel, Field


class LoginPayload(BaseModel):
    email: str
    password: str = Field(min_length=1)


class InvitePayload(BaseModel):
    email: str
    role: str = "viewer"
    full_name: str | None = None
