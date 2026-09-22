import json
import uuid
from typing import Any, Dict, List, Optional
from app.db.interfaces.standup_repository import IStandupRepository
from app.db.repositories.base_sqlite import BaseSqliteRepository
from app.db.database import get_db


class SqliteStandupRepository(BaseSqliteRepository, IStandupRepository):
    """Implementación concreta con aiosqlite de IStandupRepository."""

    def __init__(self):
        super().__init__(table_name="standups", id_column="id")

    async def create_standup(self, title: str, content: str, sources: Optional[List[str]] = None, user_id: str = "default") -> Dict[str, Any]:
        standup_id = str(uuid.uuid4())
        sources_json = json.dumps(sources or [], ensure_ascii=False)
        entity = {
            "id": standup_id,
            "user_id": user_id,
            "title": title,
            "content": content,
            "sources_json": sources_json,
        }
        await self.add(entity)
        return {"id": standup_id, "user_id": user_id, "title": title, "content": content, "sources": sources or []}

    async def get_all_standups(self, limit: int = 20) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM standups ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                rows = await cursor.fetchall()
                result = []
                for row in rows:
                    item = dict(row)
                    try:
                        item["sources"] = json.loads(item.pop("sources_json") or "[]")
                    except Exception:
                        item["sources"] = []
                    result.append(item)
                return result
