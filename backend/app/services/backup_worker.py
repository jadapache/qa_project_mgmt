from __future__ import annotations

import asyncio
import datetime
import json
import logging
from typing import Any, Dict, Optional

from app.db.database import get_db
from app.services.gdrive_service import GoogleDriveService
from app.services.sqlite_backup import create_hot_snapshot

logger = logging.getLogger("backup_worker")

CONFIG_SETTING_KEY = "gdrive_backup_config"


class BackupWorkerManager:
    _instance: Optional[BackupWorkerManager] = None

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self.is_running: bool = False
        self.last_backup_at: Optional[str] = None
        self.last_status: str = "initialized"
        self.last_error: Optional[str] = None

    @classmethod
    def get_instance(cls) -> BackupWorkerManager:
        if cls._instance is None:
            cls._instance = BackupWorkerManager()
        return cls._instance

    async def get_config(self) -> Dict[str, Any]:
        async with get_db() as db:
            async with db.execute("SELECT value_json FROM settings WHERE key = ?", (CONFIG_SETTING_KEY,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    try:
                        return json.loads(row["value_json"])
                    except Exception:
                        pass
        return {
            "enabled": True,
            "interval_seconds": 1800,
            "gdrive_token": "",
            "gdrive_folder_id": "",
            "auto_backup": True,
        }

    async def update_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        current = await self.get_config()
        current.update(config)
        value_json = json.dumps(current, ensure_ascii=False)

        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO settings (key, value_json, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (CONFIG_SETTING_KEY, value_json),
            )
            await db.commit()

        return current

    async def execute_backup(self) -> Dict[str, Any]:
        """
        Ejecuta el ciclo completo de respaldo asíncrono:
        1. Crea el snapshot en caliente comprimido (.gz).
        2. Intenta subir a Google Drive si hay token configurado.
        3. Registra el estado y tiempo de finalización.
        """
        config = await self.get_config()
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            snapshot_path = await create_hot_snapshot()
            token = config.get("gdrive_token")
            folder_id = config.get("gdrive_folder_id")

            res = await GoogleDriveService.upload_backup_file(
                file_path=snapshot_path,
                access_token=token if token else None,
                folder_id=folder_id if folder_id else None,
            )

            self.last_backup_at = now_str
            self.last_status = res.get("status", "success")
            self.last_error = None

            await self.update_config(
                {
                    "last_backup_at": self.last_backup_at,
                    "last_status": self.last_status,
                    "last_error": None,
                }
            )

            return {
                "status": self.last_status,
                "timestamp": self.last_backup_at,
                "file": snapshot_path.name,
                "details": res,
            }
        except Exception as err:
            err_msg = str(err)
            self.last_status = "error"
            self.last_error = err_msg
            logger.error("Fallo en ejecución de respaldo: %s", err_msg)
            await self.update_config({"last_status": "error", "last_error": err_msg})
            raise

    async def _worker_loop(self):
        self.is_running = True
        logger.info("Iniciando BackupWorkerManager loop en segundo plano.")
        while self.is_running:
            try:
                config = await self.get_config()
                if config.get("enabled", True) and config.get("auto_backup", True):
                    try:
                        await self.execute_backup()
                    except Exception as err:
                        logger.warning("Error periódico en worker de respaldo: %s", err)

                interval = int(config.get("interval_seconds", 1800))
                await asyncio.sleep(max(60, interval))
            except asyncio.CancelledError:
                self.is_running = False
                break
            except Exception as e:
                logger.error("Error inesperado en loop de respaldos: %s", e)
                await asyncio.sleep(60)

    def start(self):
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._worker_loop())

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
