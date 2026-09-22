from fastapi import Depends, Header

from app.db.interfaces import (
    IUserRepository,
    ISettingsRepository,
    IChatRepository,
    IStandupRepository,
    IPRDRepository,
    ITestPlanRepository,
)
from app.db.repositories import (
    SqliteUserRepository,
    SqliteSettingsRepository,
    SqliteChatRepository,
    SqliteStandupRepository,
    SqlitePRDRepository,
    SqliteTestPlanRepository,
)


def get_user_repository() -> IUserRepository:
    """Proveedor de inyección de dependencias para el repositorio de Usuarios."""
    return SqliteUserRepository()


def get_settings_repository() -> ISettingsRepository:
    """Proveedor de inyección de dependencias para el repositorio de Ajustes."""
    return SqliteSettingsRepository()


def get_chat_repository() -> IChatRepository:
    """Proveedor de inyección de dependencias para el repositorio de Chat."""
    return SqliteChatRepository()


def get_standup_repository() -> IStandupRepository:
    """Proveedor de inyección de dependencias para el repositorio de Standups."""
    return SqliteStandupRepository()


def get_prd_repository() -> IPRDRepository:
    """Proveedor de inyección de dependencias para el repositorio de PRDs."""
    return SqlitePRDRepository()


def get_test_plan_repository() -> ITestPlanRepository:
    """Proveedor de inyección de dependencias para el repositorio de Planes de Prueba."""
    return SqliteTestPlanRepository()


async def get_current_user(
    authorization: str | None = Header(default=None),
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict:
    from fastapi import HTTPException, status
    from app.core.security import decode_access_token

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autorización.",
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "username" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización inválido o expirado.",
        )
    user = await user_repo.get_by_username(payload["username"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}

