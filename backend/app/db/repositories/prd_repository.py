import uuid
from typing import Any, Dict, List
from app.db.interfaces.prd_repository import IPRDRepository
from app.db.repositories.base_sqlite import BaseSqliteRepository
from app.db.database import get_db


class SqlitePRDRepository(BaseSqliteRepository, IPRDRepository):
    """Implementación concreta con aiosqlite de IPRDRepository."""

    def __init__(self):
        super().__init__(table_name="prd_reviews", id_column="id")

    async def create_prd_review(self, prd_title: str, content: str, score: int = 0, risk_level: str = "MEDIUM") -> Dict[str, Any]:
        review_id = str(uuid.uuid4())
        entity = {
            "id": review_id,
            "prd_title": prd_title,
            "content": content,
            "score": score,
            "risk_level": risk_level,
        }
        await self.add(entity)
        return entity

    async def get_all_prd_reviews(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM prd_reviews ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
