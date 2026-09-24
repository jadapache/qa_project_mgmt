from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class SettingBase(BaseModel):
    key: str
    value: Any


class SettingInDB(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: str
    value_json: str
    updated_at: Optional[datetime | str] = None
