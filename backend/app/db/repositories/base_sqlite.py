from typing import Any, Dict, List, Optional
from app.db.base import IGenericRepository
from app.db.database import get_db


class BaseSqliteRepository(IGenericRepository[Dict[str, Any], str]):
    """
    Implementación base concreta de IGenericRepository para SQLite usando aiosqlite.
    Proporciona SELECT, INSERT, UPDATE, DELETE genéricos.
    """

    def __init__(self, table_name: str, id_column: str = "id"):
        self.table_name = table_name
        self.id_column = id_column

    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        async with get_db() as db:
            query = f"SELECT * FROM {self.table_name} WHERE {self.id_column} = ?"
            async with db.execute(query, (id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
        return None

    async def get_all(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        async with get_db() as db:
            query = f"SELECT * FROM {self.table_name} ORDER BY created_at DESC LIMIT ? OFFSET ?"
            async with db.execute(query, (limit, offset)) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]

    async def add(self, entity: Dict[str, Any]) -> Dict[str, Any]:
        columns = ", ".join(entity.keys())
        placeholders = ", ".join(["?"] * len(entity))
        values = tuple(entity.values())
        query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"

        async with get_db() as db:
            await db.execute(query, values)
            await db.commit()
        return entity

    async def update(self, id: str, entity: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        set_clause = ", ".join([f"{key} = ?" for key in entity.keys()])
        values = tuple(entity.values()) + (id,)
        query = f"UPDATE {self.table_name} SET {set_clause} WHERE {self.id_column} = ?"

        async with get_db() as db:
            cursor = await db.execute(query, values)
            await db.commit()
            if cursor.rowcount > 0:
                return await self.get_by_id(id)
        return None

    async def delete(self, id: str) -> bool:
        query = f"DELETE FROM {self.table_name} WHERE {self.id_column} = ?"
        async with get_db() as db:
            cursor = await db.execute(query, (id,))
            await db.commit()
            return cursor.rowcount > 0
