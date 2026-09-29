from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StandupBase(BaseModel):
    user_id: str = "default"
    title: str
    content: str
    sources: List[str] = Field(default_factory=list)


class StandupCreate(StandupBase):
    pass


class StandupInDB(StandupBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime | str] = None
