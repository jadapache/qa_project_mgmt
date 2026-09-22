from abc import ABC, abstractmethod
from typing import Any, Dict
from app.db.base import IGenericRepository


class ISettingsRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Ajustes / Configuraciones."""

    @abstractmethod
    async def get_setting(self, key: str, default: Any = None) -> Any:
        """Obtiene un ajuste por su clave."""
        pass

    @abstractmethod
    async def set_setting(self, key: str, value: Any) -> None:
        """Guarda o actualiza un ajuste por su clave."""
        pass
