from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatMessageBase(BaseModel):
    session_id: str
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str
    context_sources: List[Dict[str, Any]] = Field(default_factory=list)


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessageInDB(ChatMessageBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime | str] = None
