from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import urllib.request
import urllib.parse

logger = logging.getLogger("gdrive_service")


class GoogleDriveService:
    """
    Servidor para interactuar con la API v3 de Google Drive para subir y gestionar respaldos.
    """

    @staticmethod
    async def upload_backup_file(
        file_path: Path,
        access_token: Optional[str] = None,
        folder_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sube un archivo de respaldo (.gz) a Google Drive vía REST API v3 de forma asíncrona.
        Si no hay token configurado, simula o registra la preparación del respaldo local.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Archivo de respaldo {file_path} no encontrado.")

        file_size = file_path.stat().st_size
        filename = file_path.name

        if not access_token:
            logger.info("Google Drive Token no configurado. Respaldo local generado correctamente en %s", file_path)
            return {
                "status": "local_only",
                "message": "Respaldo local generado con éxito. Para subir a Google Drive configura tu Access Token.",
                "file_name": filename,
                "file_size": file_size,
                "path": str(file_path),
            }

        loop = asyncio.get_running_loop()

        def _sync_upload() -> Dict[str, Any]:
            metadata: Dict[str, Any] = {"name": filename}
            if folder_id:
                metadata["parents"] = [folder_id]

            boundary = "===QA_MGMT_GDRIVE_BOUNDARY==="
            metadata_bytes = json.dumps(metadata).encode("utf-8")
            with open(file_path, "rb") as f:
                content_bytes = f.read()

            body = bytearray()
            body.extend(f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode("utf-8"))
            body.extend(metadata_bytes)
            body.extend(f"\r\n--{boundary}\r\nContent-Type: application/gzip\r\n\r\n".encode("utf-8"))
            body.extend(content_bytes)
            body.extend(f"\r\n--{boundary}--\r\n".encode("utf-8"))

            url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": f"multipart/related; boundary={boundary}",
                "Content-Length": str(len(body)),
            }

            req = urllib.request.Request(url, data=bytes(body), headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    return {
                        "status": "uploaded",
                        "gdrive_file_id": resp_data.get("id"),
                        "file_name": resp_data.get("name"),
                        "file_size": file_size,
                    }
            except Exception as err:
                logger.error("Error al subir archivo a Google Drive: %s", err)
                raise RuntimeError(f"Error de subida a Google Drive API: {err}") from err

        return await loop.run_in_executor(None, _sync_upload)
