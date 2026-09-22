import json
import uuid
from typing import Any, Dict, List, Optional
from app.db.interfaces.chat_repository import IChatRepository
from app.db.repositories.base_sqlite import BaseSqliteRepository
from app.db.database import get_db


class SqliteChatRepository(BaseSqliteRepository, IChatRepository):
    """Implementación concreta con aiosqlite de IChatRepository."""

    def __init__(self):
        super().__init__(table_name="chat_messages", id_column="id")

    async def get_session_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute(
                """
                SELECT id, session_id, role, content, context_sources_json, created_at
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at ASC
                LIMIT ?
                """,
                (session_id, limit),
            ) as cursor:
                rows = await cursor.fetchall()
                history = []
                for row in rows:
                    item = dict(row)
                    try:
                        item["context_sources"] = json.loads(item.pop("context_sources_json") or "[]")
                    except Exception:
                        item["context_sources"] = []
                    history.append(item)
                return history

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        context_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        msg_id = str(uuid.uuid4())
        context_json = json.dumps(context_sources or [], ensure_ascii=False)
        entity = {
            "id": msg_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "context_sources_json": context_json,
        }
        await self.add(entity)
        return {
            "id": msg_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "context_sources": context_sources or [],
        }

    async def clear_session(self, session_id: str) -> bool:
        async with get_db() as db:
            cursor = await db.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
            await db.commit()
            return cursor.rowcount > 0
