from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.backup_worker import BackupWorkerManager

router = APIRouter(prefix="/backup", tags=["backup"])


class BackupConfigUpdate(BaseModel):
    enabled: bool | None = None
    interval_seconds: int | None = None
    gdrive_token: str | None = None
    gdrive_folder_id: str | None = None
    auto_backup: bool | None = None


@router.get("/status")
async def get_backup_status() -> Dict[str, Any]:
    manager = BackupWorkerManager.get_instance()
    config = await manager.get_config()
    return {
        "is_running": manager.is_running,
        "last_backup_at": manager.last_backup_at or config.get("last_backup_at"),
        "last_status": manager.last_status or config.get("last_status", "idle"),
        "last_error": manager.last_error or config.get("last_error"),
        "config": {
            "enabled": config.get("enabled", True),
            "interval_seconds": config.get("interval_seconds", 1800),
            "auto_backup": config.get("auto_backup", True),
            "gdrive_token_set": bool(config.get("gdrive_token")),
            "gdrive_folder_id": config.get("gdrive_folder_id", ""),
        },
    }


@router.post("/run")
async def run_backup_now() -> Dict[str, Any]:
    manager = BackupWorkerManager.get_instance()
    try:
        res = await manager.execute_backup()
        return {"message": "Respaldo generado exitosamente.", "result": res}
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al ejecutar respaldo: {err}",
        )


@router.put("/config")
async def update_backup_config(body: BackupConfigUpdate) -> Dict[str, Any]:
    manager = BackupWorkerManager.get_instance()
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = await manager.update_config(payload)
    return {"message": "Configuración de respaldo actualizada con éxito.", "config": updated}
