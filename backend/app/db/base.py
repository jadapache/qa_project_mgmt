from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel

SchemaType = TypeVar("SchemaType", bound=BaseModel)
KeyType = TypeVar("KeyType")


class IRepository(ABC, Generic[SchemaType, KeyType]):
    """
    Interfaz abstracta genérica para el Patrón de Repositorio (Clean Architecture & Pydantic Schemas).
    Proporciona operaciones CRUD, búsquedas dinámicas y operaciones bulk.
    """

    @abstractmethod
    async def get_all(self, limit: int = 50, offset: int = 0) -> List[SchemaType]:
        """Obtiene una lista de entidades."""
        pass

    @abstractmethod
    async def find_many(self, **kwargs: Any) -> List[SchemaType]:
        """Busca múltiples registros que coincidan con los atributos proporcionados."""
        pass

    @abstractmethod
    async def find_one(self, **kwargs: Any) -> Optional[SchemaType]:
        """Busca un solo registro que coincida con los criterios proporcionados."""
        pass

    @abstractmethod
    async def get_by_id(self, entity_id: KeyType) -> Optional[SchemaType]:
        """Obtiene un registro por su clave primaria."""
        pass

    @abstractmethod
    async def create(self, obj: BaseModel) -> SchemaType:
        """Crea una nueva entidad en la base de datos a partir de un esquema Pydantic."""
        pass

    @abstractmethod
    async def create_bulk(self, objects: List[BaseModel]) -> List[SchemaType]:
        """Crea múltiples entidades en una sola transacción."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Retorna el conteo total de registros en la tabla."""
        pass

    @abstractmethod
    async def update(self, entity_id: KeyType, obj: BaseModel | Dict[str, Any]) -> Optional[SchemaType]:
        """Actualiza una entidad existente."""
        pass

    @abstractmethod
    async def update_bulk(self, entity_ids: List[KeyType], update_data: Dict[str, Any]) -> List[SchemaType]:
        """Actualiza múltiples entidades por sus IDs."""
        pass

    @abstractmethod
    async def delete(self, entity_id: KeyType) -> bool:
        """Elimina un registro por su clave primaria."""
        pass

    @abstractmethod
    async def delete_bulk(self, entity_ids: List[KeyType]) -> bool:
        """Elimina múltiples registros por sus claves primarias."""
        pass


# Alias de retrocompatibilidad
IGenericRepository = IRepository
