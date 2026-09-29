import uuid
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from app.db.base import IRepository
from app.db.database import get_db

SchemaType = TypeVar("SchemaType", bound=BaseModel)


class BaseRepository(IRepository[SchemaType, str]):
    """
    Implementación concreta genérica de IRepository basada en aiosqlite y Esquemas Pydantic.
    Ofrece métodos para get_all, find_one, find_many, create, create_bulk, update, update_bulk, delete y delete_bulk.
    """

    def __init__(
        self,
        table_name: str,
        schema: Optional[Type[SchemaType]] = None,
        id_column: str = "id",
    ):
        self.table_name = table_name
        self.schema = schema
        self.id_column = id_column

    def _row_to_dict(self, row: Any) -> Dict[str, Any]:
        if row is None:
            return {}
        return dict(row)

    def _map_row(self, row: Any) -> Any:
        d = self._row_to_dict(row)
        if not d:
            return None
        if self.schema:
            try:
                return self.schema.model_validate(d)
            except Exception:
                pass
        return d

    async def get_by_id(self, entity_id: str) -> Optional[Any]:
        async with get_db() as db:
            query = f"SELECT * FROM {self.table_name} WHERE {self.id_column} = ?"
            async with db.execute(query, (entity_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return self._map_row(row)
        return None

    async def get_all(self, limit: int = 50, offset: int = 0) -> List[Any]:
        async with get_db() as db:
            query = f"SELECT * FROM {self.table_name} LIMIT ? OFFSET ?"
            async with db.execute(query, (limit, offset)) as cursor:
                rows = await cursor.fetchall()
                return [self._map_row(r) for r in rows]

    async def find_many(self, **kwargs: Any) -> List[Any]:
        if not kwargs:
            return await self.get_all()
        conditions = [f"{k} = ?" for k in kwargs.keys()]
        where_clause = " AND ".join(conditions)
        values = tuple(kwargs.values())
        query = f"SELECT * FROM {self.table_name} WHERE {where_clause}"
        async with get_db() as db:
            async with db.execute(query, values) as cursor:
                rows = await cursor.fetchall()
                return [self._map_row(r) for r in rows]

    async def find_one(self, **kwargs: Any) -> Optional[Any]:
        items = await self.find_many(**kwargs)
        return items[0] if items else None

    async def count(self) -> int:
        async with get_db() as db:
            query = f"SELECT COUNT(*) as count FROM {self.table_name}"
            async with db.execute(query) as cursor:
                row = await cursor.fetchone()
                return row["count"] if row else 0

    async def add(self, entity: Dict[str, Any]) -> Dict[str, Any]:
        columns = ", ".join(entity.keys())
        placeholders = ", ".join(["?"] * len(entity))
        values = tuple(entity.values())
        query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"

        async with get_db() as db:
            await db.execute(query, values)
            await db.commit()
        return entity

    async def create(self, obj: BaseModel | Dict[str, Any]) -> Any:
        if isinstance(obj, BaseModel):
            data = obj.model_dump(exclude_none=True)
        else:
            data = dict(obj)

        if self.id_column not in data:
            data[self.id_column] = str(uuid.uuid4())

        await self.add(data)
        return await self.get_by_id(data[self.id_column])

    async def create_bulk(self, objects: List[BaseModel | Dict[str, Any]]) -> List[Any]:
        if not objects:
            return []
        created_ids = []
        async with get_db() as db:
            for obj in objects:
                if isinstance(obj, BaseModel):
                    data = obj.model_dump(exclude_none=True)
                else:
                    data = dict(obj)
                if self.id_column not in data:
                    data[self.id_column] = str(uuid.uuid4())

                columns = ", ".join(data.keys())
                placeholders = ", ".join(["?"] * len(data))
                values = tuple(data.values())
                query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
                await db.execute(query, values)
                created_ids.append(data[self.id_column])
            await db.commit()

        result = []
        for entity_id in created_ids:
            item = await self.get_by_id(entity_id)
            if item:
                result.append(item)
        return result

    async def update(self, entity_id: str, obj: BaseModel | Dict[str, Any]) -> Optional[Any]:
        if isinstance(obj, BaseModel):
            data = obj.model_dump(exclude_unset=True)
        else:
            data = dict(obj)

        if not data:
            return await self.get_by_id(entity_id)

        set_clause = ", ".join([f"{key} = ?" for key in data.keys()])
        values = tuple(data.values()) + (entity_id,)
        query = f"UPDATE {self.table_name} SET {set_clause} WHERE {self.id_column} = ?"

        async with get_db() as db:
            cursor = await db.execute(query, values)
            await db.commit()
            if cursor.rowcount > 0:
                return await self.get_by_id(entity_id)
        return None

    async def update_bulk(self, entity_ids: List[str], update_data: Dict[str, Any]) -> List[Any]:
        if not entity_ids or not update_data:
            return []

        set_clause = ", ".join([f"{key} = ?" for key in update_data.keys()])
        placeholders = ", ".join(["?"] * len(entity_ids))
        values = tuple(update_data.values()) + tuple(entity_ids)
        query = f"UPDATE {self.table_name} SET {set_clause} WHERE {self.id_column} IN ({placeholders})"

        async with get_db() as db:
            await db.execute(query, values)
            await db.commit()

        updated_items = []
        for eid in entity_ids:
            item = await self.get_by_id(eid)
            if item:
                updated_items.append(item)
        return updated_items

    async def delete(self, entity_id: str) -> bool:
        query = f"DELETE FROM {self.table_name} WHERE {self.id_column} = ?"
        async with get_db() as db:
            cursor = await db.execute(query, (entity_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def delete_bulk(self, entity_ids: List[str]) -> bool:
        if not entity_ids:
            return False
        placeholders = ", ".join(["?"] * len(entity_ids))
        query = f"DELETE FROM {self.table_name} WHERE {self.id_column} IN ({placeholders})"
        async with get_db() as db:
            cursor = await db.execute(query, tuple(entity_ids))
            await db.commit()
            return cursor.rowcount > 0
