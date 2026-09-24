import json
import uuid
from typing import Any, Dict, List, Optional
from app.db.interfaces.standup_repository import IStandupRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.standup import StandupCreate, StandupInDB


class StandupRepository(BaseRepository, IStandupRepository):
    """Implementación concreta de IStandupRepository utilizando esquemas Pydantic."""

    def __init__(self):
        super().__init__(table_name="standups", id_column="id")

    async def create_standup(
        self, title: str, content: str, sources: Optional[List[str]] = None, user_id: str = "default"
    ) -> Dict[str, Any]:
        standup_id = str(uuid.uuid4())
        src_list = sources or []
        standup_schema = StandupCreate(
            user_id=user_id,
            title=title,
            content=content,
            sources=src_list,
        )
        sources_json = json.dumps(standup_schema.sources, ensure_ascii=False)
        entity = {
            "id": standup_id,
            "user_id": standup_schema.user_id,
            "title": standup_schema.title,
            "content": standup_schema.content,
            "sources_json": sources_json,
        }
        await self.add(entity)
        return {
            "id": standup_id,
            "user_id": standup_schema.user_id,
            "title": standup_schema.title,
            "content": standup_schema.content,
            "sources": standup_schema.sources,
        }

    async def get_all_standups(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM standups ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                result = []
                for row in rows:
                    item = dict(row)
                    try:
                        raw_sources = json.loads(item.pop("sources_json") or "[]")
                    except Exception:
                        raw_sources = []
                    
                    standup = StandupInDB(
                        id=item["id"],
                        user_id=item.get("user_id", "default"),
                        title=item["title"],
                        content=item["content"],
                        sources=raw_sources,
                        created_at=item.get("created_at"),
                    )
                    result.append(standup.model_dump())
                return result
