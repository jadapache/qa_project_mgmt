import json
from typing import Any, Dict
from app.db.interfaces.settings_repository import ISettingsRepository
from app.db.repositories.base_repository import BaseRepository
from app.db.database import get_db
from app.schemas.settings import SettingBase


class SettingsRepository(BaseRepository, ISettingsRepository):
    """Implementación concreta de ISettingsRepository utilizando esquemas Pydantic."""

    def __init__(self):
        super().__init__(table_name="settings", id_column="key")

    async def get_setting(self, key: str, default: Any = None) -> Any:
        async with get_db() as db:
            async with db.execute("SELECT value_json FROM settings WHERE key = ?", (key,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    try:
                        return json.loads(row["value_json"])
                    except Exception:
                        return row["value_json"]
        return default

    async def set_setting(self, key: str, value: Any) -> None:
        setting_schema = SettingBase(key=key, value=value)
        value_json = json.dumps(setting_schema.value, ensure_ascii=False)
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO settings (key, value_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (setting_schema.key, value_json),
            )
            await db.commit()

    async def get_all_settings(self) -> Dict[str, Any]:
        async with get_db() as db:
            async with db.execute("SELECT key, value_json FROM settings") as cursor:
                rows = await cursor.fetchall()
                result = {}
                for row in rows:
                    try:
                        val = json.loads(row["value_json"])
                    except Exception:
                        val = row["value_json"]
                    setting_schema = SettingBase(key=row["key"], value=val)
                    result[setting_schema.key] = setting_schema.value
                return result
