import uuid
from typing import Any, Dict, Optional
from app.db.interfaces.user_repository import IUserRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.user import UserCreate


class UserRepository(BaseRepository, IUserRepository):
    """Implementación concreta de IUserRepository utilizando esquemas Pydantic."""

    def __init__(self):
        super().__init__(table_name="users", id_column="id")

    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM users WHERE username = ?", (username,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
        return None

    async def create_user(
        self, username: str, email: str = "", full_name: str = "", role: str = "user"
    ) -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        user_schema = UserCreate(
            username=username,
            email=email,
            full_name=full_name,
            role=role,
            status="pending",
        )
        entity = {"id": user_id, **user_schema.model_dump(exclude_none=True)}
        return await self.add(entity)

    async def create_user_with_password(
        self,
        username: str,
        password_hash: str,
        password_salt: str,
        email: str = "",
        full_name: str = "",
        role: str = "user",
        status: str = "pending",
    ) -> Dict[str, Any]:
        user_id = str(uuid.uuid4())
        async with get_db() as db:
            async with db.execute("SELECT COUNT(*) as count FROM users") as cursor:
                row = await cursor.fetchone()
                user_count = row["count"] if row else 0

        final_status = "approved" if user_count == 0 else status
        final_role = "admin" if user_count == 0 else role

        user_schema = UserCreate(
            username=username,
            email=email,
            full_name=full_name,
            role=final_role,
            status=final_status,
            password_hash=password_hash,
            password_salt=password_salt,
        )
        entity = {"id": user_id, **user_schema.model_dump(exclude_none=True)}
        return await self.add(entity)

    async def get_pending_users(self) -> list[Dict[str, Any]]:
        async with get_db() as db:
            async with db.execute("SELECT * FROM users WHERE status = 'pending' ORDER BY created_at DESC") as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def update_user_status(self, user_id: str, status: str) -> Optional[Dict[str, Any]]:
        async with get_db() as db:
            await db.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
            await db.commit()
        return await self.get_by_id(user_id)
