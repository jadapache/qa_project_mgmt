from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from app.db.base import IGenericRepository


class IUserRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Usuarios (útil para testing & DI)."""

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Busca un usuario por su nombre de usuario único."""
        pass

    @abstractmethod
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
        """Crea un usuario registrando su hash y salt de contraseña, así como su estado (pending, approved, rejected)."""
        pass

    @abstractmethod
    async def get_pending_users(self) -> list[Dict[str, Any]]:
        """Obtiene todas las solicitudes de acceso pendientes de aprobación."""
        pass

    @abstractmethod
    async def update_user_status(self, user_id: str, status: str) -> Optional[Dict[str, Any]]:
        """Actualiza el estado de una solicitud de acceso (approved, rejected, pending)."""
        pass


