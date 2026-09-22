from abc import ABC, abstractmethod
from typing import Generic, List, Optional, TypeVar

T = TypeVar("T")
K = TypeVar("K")


class IGenericRepository(ABC, Generic[T, K]):
    """
    Interfaz abstracta genérica para el Patrón de Repositorio (Clean Architecture).
    Define las operaciones fundamentales SELECT, INSERT, UPDATE, DELETE.
    """

    @abstractmethod
    async def get_by_id(self, id: K) -> Optional[T]:
        """SELECT por Identificador Primario."""
        pass

    @abstractmethod
    async def get_all(self, limit: int = 50, offset: int = 0) -> List[T]:
        """SELECT con paginación."""
        pass

    @abstractmethod
    async def add(self, entity: T) -> T:
        """INSERT nueva entidad."""
        pass

    @abstractmethod
    async def update(self, id: K, entity: T) -> Optional[T]:
        """UPDATE de una entidad existente."""
        pass

    @abstractmethod
    async def delete(self, id: K) -> bool:
        """DELETE por Identificador Primario."""
        pass
