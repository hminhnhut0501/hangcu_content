from fastapi import APIRouter

from app.repositories.system_repo import list_settings, upsert_setting
from app.schemas.settings import SettingUpdate
from app.schemas.common import StatusResponse

router = APIRouter()


@router.get("")
def get_settings():
    return list_settings()


@router.post("", response_model=StatusResponse)
def update_setting(payload: SettingUpdate):
    upsert_setting(payload.key, payload.value)
    return {"ok": True}
