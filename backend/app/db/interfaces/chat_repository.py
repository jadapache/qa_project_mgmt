from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.db.base import IGenericRepository


class IChatRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Mensajes de Chat con IA."""

    @abstractmethod
    async def get_session_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Obtiene los mensajes de una sesión de chat."""
        pass

    @abstractmethod
    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        context_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Guarda un mensaje de chat."""
        pass

    @abstractmethod
    async def clear_session(self, session_id: str) -> bool:
        """Limpia el historial de una sesión de chat."""
        pass
