import uuid
from typing import Any, Dict, List
from app.db.interfaces.test_plan_repository import ITestPlanRepository
from app.db.repositories.base_sqlite import BaseSqliteRepository
from app.db.database import get_db


class SqliteTestPlanRepository(BaseSqliteRepository, ITestPlanRepository):
    """Implementación concreta con aiosqlite de ITestPlanRepository."""

    def __init__(self):
        super().__init__(table_name="test_plans", id_column="id")

    async def create_test_plan(self, feature_name: str, content: str, test_type: str = "regression") -> Dict[str, Any]:
        plan_id = str(uuid.uuid4())
        entity = {
            "id": plan_id,
            "feature_name": feature_name,
            "test_type": test_type,
            "content": content,
        }
        await self.add(entity)
        return entity

    async def get_all_test_plans(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM test_plans ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
