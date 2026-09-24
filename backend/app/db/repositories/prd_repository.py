import uuid
from typing import Any, Dict, List
from app.db.interfaces.prd_repository import IPRDRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.prd import PRDReviewCreate, PRDReviewInDB


class PRDRepository(BaseRepository, IPRDRepository):
    """Implementación concreta de IPRDRepository utilizando esquemas Pydantic."""

    def __init__(self):
        super().__init__(table_name="prd_reviews", schema=PRDReviewInDB, id_column="id")

    async def create_prd_review(
        self, prd_title: str, content: str, score: int = 0, risk_level: str = "MEDIUM"
    ) -> Dict[str, Any]:
        review_id = str(uuid.uuid4())
        review_schema = PRDReviewCreate(
            prd_title=prd_title,
            content=content,
            score=score,
            risk_level=risk_level,
        )
        entity = {
            "id": review_id,
            **review_schema.model_dump(),
        }
        await self.add(entity)
        return entity

    async def get_all_prd_reviews(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM prd_reviews ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                result = []
                for row in rows:
                    review = PRDReviewInDB.model_validate(dict(row))
                    result.append(review.model_dump())
                return result
