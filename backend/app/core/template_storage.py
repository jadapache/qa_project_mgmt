"""
Módulo de almacenamiento y administración de plantillas corporativas (.doc, .docx, .xlsx, .md, .txt).
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.settings import LOCAL_DIR, SETTINGS_DIR, ensure_local_dirs

TEMPLATES_DIR = LOCAL_DIR / "templates"
INDEX_FILE = SETTINGS_DIR / "templates_index.json"


def ensure_template_dirs() -> None:
    ensure_local_dirs()
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)


def _load_index() -> List[Dict[str, Any]]:
    ensure_template_dirs()
    if not INDEX_FILE.exists():
        return []
    try:
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_index(items: List[Dict[str, Any]]) -> None:
    ensure_template_dirs()
    INDEX_FILE.write_text(json.dumps(items, indent=2), encoding="utf-8")


def list_templates() -> List[Dict[str, Any]]:
    return _load_index()


def get_template(template_id: str) -> Optional[Dict[str, Any]]:
    items = _load_index()
    for item in items:
        if item["id"] == template_id:
            return item
    return None


def save_template_file(
    filename: str, file_bytes: bytes, title: str = "", module: str = "general"
) -> Dict[str, Any]:
    ensure_template_dirs()
    template_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()
    stored_filename = f"{template_id}{ext}"
    file_path = TEMPLATES_DIR / stored_filename
    file_path.write_bytes(file_bytes)

    item = {
        "id": template_id,
        "title": title.strip() or Path(filename).stem,
        "filename": filename,
        "stored_filename": stored_filename,
        "file_type": ext.lstrip("."),
        "file_size": len(file_bytes),
        "module": module or "general",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    items = _load_index()
    items.append(item)
    _save_index(items)
    return item


def update_template_metadata(
    template_id: str, title: Optional[str] = None, module: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    items = _load_index()
    for item in items:
        if item["id"] == template_id:
            if title is not None and title.strip():
                item["title"] = title.strip()
            if module is not None and module.strip():
                item["module"] = module.strip()
            _save_index(items)
            return item
    return None


def delete_template(template_id: str) -> bool:
    items = _load_index()
    target = None
    new_items = []
    for item in items:
        if item["id"] == template_id:
            target = item
        else:
            new_items.append(item)

    if target:
        _save_index(new_items)
        file_path = TEMPLATES_DIR / target.get("stored_filename", "")
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        return True
    return False
