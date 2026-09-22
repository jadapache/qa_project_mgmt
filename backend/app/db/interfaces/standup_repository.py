from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.db.base import IGenericRepository


class IStandupRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Standups diarios."""

    @abstractmethod
    async def create_standup(self, title: str, content: str, sources: Optional[List[str]] = None, user_id: str = "default") -> Dict[str, Any]:
        """Crea y almacena un reporte de Standup."""
        pass
