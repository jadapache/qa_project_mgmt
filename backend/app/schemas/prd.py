from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PRDReviewBase(BaseModel):
    prd_title: str
    content: str
    score: int = Field(default=0, ge=0, le=100)
    risk_level: str = "MEDIUM"


class PRDReviewCreate(PRDReviewBase):
    pass


class PRDReviewInDB(PRDReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime | str] = None
