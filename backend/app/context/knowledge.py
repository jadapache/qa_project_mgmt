"""Knowledge document storage, text extraction, and chunking."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any

from app.core.settings import LOCAL_DIR, ensure_local_dirs

KNOWLEDGE_DIR = LOCAL_DIR / "knowledge"
DOCUMENTS_DIR = KNOWLEDGE_DIR / "documents"
CHUNKS_PATH = KNOWLEDGE_DIR / "chunks.json"
MANIFEST_PATH = KNOWLEDGE_DIR / "manifest.json"

CHUNK_SIZE = 900
CHUNK_OVERLAP = 120


def ensure_knowledge_dirs() -> None:
  ensure_local_dirs()
  DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
  if not CHUNKS_PATH.exists():
    CHUNKS_PATH.write_text("[]", encoding="utf-8")
  if not MANIFEST_PATH.exists():
    MANIFEST_PATH.write_text("[]", encoding="utf-8")


def _load_json(path: Path) -> list[dict[str, Any]]:
  ensure_knowledge_dirs()
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except (json.JSONDecodeError, OSError):
    return []


def _save_json(path: Path, payload: list[dict[str, Any]]) -> None:
  ensure_knowledge_dirs()
  path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_documents() -> list[dict[str, Any]]:
  return _load_json(MANIFEST_PATH)


def load_chunks() -> list[dict[str, Any]]:
  return _load_json(CHUNKS_PATH)


def extract_text(filename: str, raw: bytes) -> str:
  lower = filename.lower()
  if lower.endswith(".pdf"):
    return _extract_pdf(raw)
  if lower.endswith(".docx"):
    return _extract_docx(raw)
  if lower.endswith((".html", ".htm")):
    return _extract_html(raw)
  # md / txt / json / yaml / etc.
  for encoding in ("utf-8", "utf-16", "latin-1"):
    try:
      return raw.decode(encoding)
    except UnicodeDecodeError:
      continue
  return raw.decode("utf-8", errors="ignore")


def _extract_pdf(raw: bytes) -> str:
  try:
    from pypdf import PdfReader
    from io import BytesIO

    reader = PdfReader(BytesIO(raw))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)
  except Exception as exc:
    raise ValueError(f"Failed to read PDF: {exc}") from exc


def _extract_docx(raw: bytes) -> str:
  try:
    from docx import Document
    from io import BytesIO

    document = Document(BytesIO(raw))
    return "\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text)
  except Exception as exc:
    raise ValueError(f"Failed to read DOCX: {exc}") from exc


def _extract_html(raw: bytes) -> str:
  for encoding in ("utf-8", "utf-16", "latin-1"):
    try:
      html = raw.decode(encoding)
      break
    except UnicodeDecodeError:
      continue
  else:
    html = raw.decode("utf-8", errors="ignore")

  # Drop scripts/styles, then strip tags for BM25 text.
  html = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
  html = re.sub(r"(?is)<(br|p|div|li|h[1-6]|tr)[^>]*>", "\n", html)
  text = re.sub(r"(?s)<[^>]+>", " ", html)
  return unescape(re.sub(r"\s+", " ", text)).strip()


def chunk_text(text: str) -> list[str]:
  cleaned = re.sub(r"\s+", " ", text).strip()
  if not cleaned:
    return []
  if len(cleaned) <= CHUNK_SIZE:
    return [cleaned]

  chunks: list[str] = []
  start = 0
  while start < len(cleaned):
    end = min(start + CHUNK_SIZE, len(cleaned))
    chunks.append(cleaned[start:end])
    if end >= len(cleaned):
      break
    start = max(0, end - CHUNK_OVERLAP)
  return chunks


def ingest_document(
  *,
  filename: str,
  raw: bytes,
  tags: list[str] | None = None,
) -> dict[str, Any]:
  ensure_knowledge_dirs()
  text = extract_text(filename, raw)
  if not text.strip():
    raise ValueError("No extractable text found in document.")

  doc_id = str(uuid.uuid4())
  safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", filename)
  stored_name = f"{doc_id}_{safe_name}"
  (DOCUMENTS_DIR / stored_name).write_bytes(raw)

  pieces = chunk_text(text)
  now = datetime.now(timezone.utc).isoformat()
  manifest = _load_json(MANIFEST_PATH)
  entry = {
    "id": doc_id,
    "filename": filename,
    "stored_as": stored_name,
    "tags": tags or [],
    "chunk_count": len(pieces),
    "uploaded_at": now,
    "char_count": len(text),
  }
  manifest.append(entry)
  _save_json(MANIFEST_PATH, manifest)

  chunks = _load_json(CHUNKS_PATH)
  for index, piece in enumerate(pieces):
    chunks.append(
      {
        "id": f"{doc_id}:{index}",
        "document_id": doc_id,
        "filename": filename,
        "tags": tags or [],
        "index": index,
        "text": piece,
        "uploaded_at": now,
      }
    )
  _save_json(CHUNKS_PATH, chunks)
  return entry


def get_chunks_for_documents(document_ids: list[str], *, max_chunks: int = 48) -> list[dict[str, Any]]:
  if not document_ids:
    return []
  allowed = set(document_ids)
  chunks = _load_json(CHUNKS_PATH)
  matched = [item for item in chunks if str(item.get("document_id")) in allowed]
  matched.sort(key=lambda item: (str(item.get("document_id")), int(item.get("index") or 0)))
  return matched[:max_chunks]


def delete_document(document_id: str) -> bool:
  ensure_knowledge_dirs()
  manifest = _load_json(MANIFEST_PATH)
  match = next((item for item in manifest if item.get("id") == document_id), None)
  if not match:
    return False

  stored = DOCUMENTS_DIR / match["stored_as"]
  if stored.exists():
    stored.unlink()

  _save_json(MANIFEST_PATH, [item for item in manifest if item.get("id") != document_id])
  chunks = _load_json(CHUNKS_PATH)
  _save_json(CHUNKS_PATH, [item for item in chunks if item.get("document_id") != document_id])
  return True
