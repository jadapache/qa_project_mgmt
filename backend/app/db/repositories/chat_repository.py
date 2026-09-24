import json
import uuid
from typing import Any, Dict, List, Optional
from app.db.interfaces.chat_repository import IChatRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.chat import ChatMessageCreate, ChatMessageInDB


class ChatRepository(BaseRepository, IChatRepository):
    """Implementación concreta de IChatRepository utilizando esquemas Pydantic."""

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
                        raw_sources = json.loads(item.pop("context_sources_json") or "[]")
                    except Exception:
                        raw_sources = []
                    
                    msg_schema = ChatMessageInDB(
                        id=item["id"],
                        session_id=item["session_id"],
                        role=item["role"],
                        content=item["content"],
                        context_sources=raw_sources,
                        created_at=item.get("created_at"),
                    )
                    history.append(msg_schema.model_dump())
                return history

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        context_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        msg_id = str(uuid.uuid4())
        sources = context_sources or []
        msg_schema = ChatMessageCreate(
            session_id=session_id,
            role=role,
            content=content,
            context_sources=sources,
        )
        context_json = json.dumps(sources, ensure_ascii=False)
        entity = {
            "id": msg_id,
            "session_id": msg_schema.session_id,
            "role": msg_schema.role,
            "content": msg_schema.content,
            "context_sources_json": context_json,
        }
        await self.add(entity)
        return {
            "id": msg_id,
            "session_id": msg_schema.session_id,
            "role": msg_schema.role,
            "content": msg_schema.content,
            "context_sources": msg_schema.context_sources,
        }

    async def clear_session(self, session_id: str) -> bool:
        async with get_db() as db:
            cursor = await db.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
            await db.commit()
            return cursor.rowcount > 0
