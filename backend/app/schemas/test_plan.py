from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TestPlanBase(BaseModel):
    feature_name: str
    test_type: str = "regression"
    content: str


class TestPlanCreate(TestPlanBase):
    pass


class TestPlanInDB(TestPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime | str] = None
