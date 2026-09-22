import uuid
from typing import Any, Dict, Optional
from app.db.interfaces.user_repository import IUserRepository
from app.db.repositories.base_sqlite import BaseSqliteRepository
from app.db.database import get_db


class SqliteUserRepository(BaseSqliteRepository, IUserRepository):
    """Implementación concreta con aiosqlite de IUserRepository."""

    def __init__(self):
        super().__init__(table_name="users", id_column="id")

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM users WHERE username = ?", (username,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
        return None

    async def create_user(self, username: str, email: str = "", full_name: str = "", role: str = "user") -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        entity = {
            "id": user_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": role,
        }
        return await self.add(entity)
