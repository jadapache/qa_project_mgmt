import uuid
from typing import Any, Dict, List
from app.db.interfaces.test_plan_repository import ITestPlanRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.test_plan import TestPlanCreate, TestPlanInDB


class TestPlanRepository(BaseRepository, ITestPlanRepository):
    """Implementación concreta de ITestPlanRepository utilizando esquemas Pydantic."""
    __test__ = False

    def __init__(self):
        super().__init__(table_name="test_plans", schema=TestPlanInDB, id_column="id")

    async def create_test_plan(
        self, feature_name: str, content: str, test_type: str = "regression"
    ) -> Dict[str, Any]:
        plan_id = str(uuid.uuid4())
        plan_schema = TestPlanCreate(
            feature_name=feature_name,
            test_type=test_type,
            content=content,
        )
        entity = {
            "id": plan_id,
            **plan_schema.model_dump(),
        }
        await self.add(entity)
        return entity

    async def get_all_test_plans(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM test_plans ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                result = []
                for row in rows:
                    plan = TestPlanInDB.model_validate(dict(row))
                    result.append(plan.model_dump())
                return result
