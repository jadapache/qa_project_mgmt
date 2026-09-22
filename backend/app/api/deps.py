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
