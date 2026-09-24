from app.db.repositories.base_repository import BaseRepository
from app.db.repositories.user_repository import UserRepository
from app.db.repositories.settings_repository import SettingsRepository
from app.db.repositories.chat_repository import ChatRepository
from app.db.repositories.standup_repository import StandupRepository
from app.db.repositories.prd_repository import PRDRepository
from app.db.repositories.test_plan_repository import TestPlanRepository

# Backward compatibility aliases
BaseSqliteRepository = BaseRepository
SqliteUserRepository = UserRepository
SqliteSettingsRepository = SettingsRepository
SqliteChatRepository = ChatRepository
SqliteStandupRepository = StandupRepository
SqlitePRDRepository = PRDRepository
SqliteTestPlanRepository = TestPlanRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "SettingsRepository",
    "ChatRepository",
    "StandupRepository",
    "PRDRepository",
    "TestPlanRepository",
    "BaseSqliteRepository",
    "SqliteUserRepository",
    "SqliteSettingsRepository",
    "SqliteChatRepository",
    "SqliteStandupRepository",
    "SqlitePRDRepository",
    "SqliteTestPlanRepository",
]
