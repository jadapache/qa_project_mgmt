import asyncio
import datetime
import gzip
import os
import shutil
import sqlite3
from pathlib import Path
from typing import Optional

from app.core.settings import LOCAL_DIR
from app.db.database import DB_PATH

BACKUPS_DIR = LOCAL_DIR / "backups"


def _sync_hot_backup(target_gz_path: Path) -> Path:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    temp_db_path = BACKUPS_DIR / f"temp_{target_gz_path.stem}.db"

    try:
        # Create hot snapshot using sqlite3 backup API
        src = sqlite3.connect(DB_PATH)
        dst = sqlite3.connect(temp_db_path)
        with dst:
            src.backup(dst)
        dst.close()
        src.close()

        # Compress to .gz
        with open(temp_db_path, "rb") as f_in:
            with gzip.open(target_gz_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)

        return target_gz_path
    finally:
        if temp_db_path.exists():
            try:
                os.remove(temp_db_path)
            except Exception:
                pass


async def create_hot_snapshot(target_gz_path: Optional[Path] = None) -> Path:
    """
    Realiza una copia de seguridad en caliente comprimida (.gz) de SQLite de forma asíncrona no bloqueante.
    """
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    if not target_gz_path:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        target_gz_path = BACKUPS_DIR / f"app_backup_{timestamp}.db.gz"

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _sync_hot_backup, target_gz_path)
