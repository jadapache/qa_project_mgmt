from abc import ABC, abstractmethod
from typing import Any, Dict
from app.db.base import IGenericRepository


class IPRDRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Auditorías de PRD."""

    @abstractmethod
    async def create_prd_review(self, prd_title: str, content: str, score: int = 0, risk_level: str = "MEDIUM") -> Dict[str, Any]:
        """Crea y almacena una revisión de especificación PRD."""
        pass
