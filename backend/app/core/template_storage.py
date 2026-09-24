"""
Módulo de almacenamiento, extracción de contenido y administración de plantillas corporativas (.doc, .docx, .xlsx, .md, .txt).
"""

from __future__ import annotations

import json
import re
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import docx
except ImportError:
    docx = None

from app.core.settings import LOCAL_DIR, SETTINGS_DIR, ensure_local_dirs

TEMPLATES_DIR = LOCAL_DIR / "templates"
INDEX_FILE = SETTINGS_DIR / "templates_index.json"

DEFAULT_SYSTEM_TAGS: List[Dict[str, str]] = [
    {"tag": "FECHA", "label": "Fecha del Documento", "description": "Fecha actual de elaboración o generación"},
    {"tag": "AREA", "label": "Área / Sede", "description": "Sedes (HIC / ICV / IMAP) y área solicitante"},
    {"tag": "MODULO", "label": "Módulo / Funcionalidad", "description": "Módulo o sistema de información impactado"},
    {"tag": "OBSERVACIONES", "label": "Observaciones Complementarias", "description": "Casos de borde, restricciones y recomendaciones"},
    {"tag": "NECESIDAD", "label": "Necesidad Identificada", "description": "Descripción del funcionamiento actual y pantallas"},
    {"tag": "IMPACTO", "label": "Impacto en Negocio", "description": "Impacto operacional en tiempo, costos y reprocesos"},
    {"tag": "SOLUCION", "label": "Requerimiento Deseado", "description": "Comportamiento y flujo esperado en el nuevo sistema"},
    {"tag": "PRIORIDAD", "label": "Prioridad", "description": "Nivel de prioridad (Alta / Media / Baja)"},
    {"tag": "FIRMAS", "label": "Firma Participantes", "description": "Tabla de participantes y aprobadores"},
]


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
    items = _load_index()
    for item in items:
        if "tags" not in item:
            item["tags"] = [t["tag"] for t in DEFAULT_SYSTEM_TAGS]
    return items


def get_template(template_id: str) -> Optional[Dict[str, Any]]:
    items = _load_index()
    for item in items:
        if item["id"] == template_id:
            if "tags" not in item:
                item["tags"] = [t["tag"] for t in DEFAULT_SYSTEM_TAGS]
            return item
    return None


def extract_template_content(stored_filename: str) -> str:
    file_path = TEMPLATES_DIR / stored_filename
    if not file_path.exists():
        return "El archivo de la plantilla no se encuentra en el servidor."

    ext = file_path.suffix.lower()

    # Plain text formats
    if ext in [".md", ".txt", ".json", ".csv", ".html", ".xml"]:
        try:
            return file_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            try:
                return file_path.read_text(encoding="latin-1")
            except Exception as e:
                return f"Error al leer el archivo de texto: {e}"

    # DOCX format
    if ext == ".docx":
        if docx is not None:
            try:
                doc = docx.Document(file_path)
                lines = []
                for p in doc.paragraphs:
                    if p.text.strip():
                        lines.append(p.text)
                for t in doc.tables:
                    for row in t.rows:
                        row_cells = [c.text.strip() for c in row.cells if c.text.strip()]
                        if row_cells:
                            lines.append(" | ".join(row_cells))
                return "\n\n".join(lines) if lines else "Archivo Word (.docx) procesado (sin texto visible)."
            except Exception as e:
                return f"Error al procesar el documento Word (.docx): {e}"

    # XLSX format (Extract text from sharedStrings or sheet XML)
    if ext == ".xlsx":
        try:
            lines = []
            with zipfile.ZipFile(file_path, "r") as z:
                if "xl/sharedStrings.xml" in z.namelist():
                    content = z.read("xl/sharedStrings.xml").decode("utf-8", errors="ignore")
                    strings = re.findall(r"<t[^>]*>(.*?)</t>", content)
                    lines.extend([s for s in strings if s.strip()])
            return "\n".join(lines) if lines else "Archivo Excel (.xlsx) cargado exitosamente."
        except Exception:
            return "Archivo de Hoja de Cálculo Excel (.xlsx) listo para estructurar celdas y etiquetas."

    # Binary fallback / DOC format
    try:
        raw_bytes = file_path.read_bytes()
        printable_strings = re.findall(rb"[\x20-\x7E\x80-\xFF]{4,}", raw_bytes)
        decoded = [s.decode("utf-8", errors="ignore") for s in printable_strings if len(s.strip()) > 3]
        if decoded:
            return "\n".join(decoded[:200])
    except Exception:
        pass

    return f"Plantilla binaria ({ext}) almacenada correctamente."


def detect_tags(content: str) -> List[str]:
    found = set()
    # Matches {{TAG}}, [[TAG]], or {TAG}
    matches = re.findall(r"\{\{\s*([A-Za-z0-9_\-\.]+)\s*\}\}|\[\[\s*([A-Za-z0-9_\-\.]+)\s*\]\]", content)
    for m in matches:
        tag = m[0] or m[1]
        if tag:
            found.add(tag.upper())
    return sorted(list(found))


def save_template_file(
    filename: str, file_bytes: bytes, title: str = "", module: str = "general"
) -> Dict[str, Any]:
    ensure_template_dirs()
    template_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()
    stored_filename = f"{template_id}{ext}"
    file_path = TEMPLATES_DIR / stored_filename
    file_path.write_bytes(file_bytes)

    # Initial content extraction & tag detection
    content_sample = extract_template_content(stored_filename)
    detected = detect_tags(content_sample)
    default_tags = [t["tag"] for t in DEFAULT_SYSTEM_TAGS]
    merged_tags = sorted(list(set(default_tags + detected)))

    item = {
        "id": template_id,
        "title": title.strip() or Path(filename).stem,
        "filename": filename,
        "stored_filename": stored_filename,
        "file_type": ext.lstrip("."),
        "file_size": len(file_bytes),
        "module": module or "general",
        "tags": merged_tags,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    items = _load_index()
    items.append(item)
    _save_index(items)
    return item


def update_template_metadata(
    template_id: str,
    title: Optional[str] = None,
    module: Optional[str] = None,
    tags: Optional[List[str]] = None,
    content: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    items = _load_index()
    for item in items:
        if item["id"] == template_id:
            if title is not None and title.strip():
                item["title"] = title.strip()
            if module is not None and module.strip():
                item["module"] = module.strip()
            if tags is not None:
                item["tags"] = sorted(list(set(tags)))

            # If user updated text content for text/md files
            if content is not None:
                file_path = TEMPLATES_DIR / item.get("stored_filename", "")
                ext = file_path.suffix.lower()
                if ext in [".md", ".txt", ".json", ".html", ".xml", ".csv"]:
                    file_path.write_text(content, encoding="utf-8")
                    item["file_size"] = len(content.encode("utf-8"))

            _save_index(items)
            return item
    return None


def get_template_detail(template_id: str) -> Optional[Dict[str, Any]]:
    item = get_template(template_id)
    if not item:
        return None

    content = extract_template_content(item.get("stored_filename", ""))
    detected = detect_tags(content)

    return {
        "template": item,
        "content": content,
        "detected_tags": detected,
        "system_tags": DEFAULT_SYSTEM_TAGS,
    }


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

