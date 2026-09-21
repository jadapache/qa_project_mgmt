import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import RagDocument

ALLOWED_MIME_TYPES = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 # 50 MB (Req. 9.2)

def validate_ingest_file(filename: str, mime_type: str, size_bytes: int):
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El tamaño del archivo ({size_bytes / (1024*1024):.2f} MB) supera el límite máximo permitido de 50 MB."
        )

    ext = filename.split(".")[-1].lower() if "." in filename else ""
    valid_exts = ["pdf", "txt", "md", "markdown", "docx"]
    if mime_type not in ALLOWED_MIME_TYPES and ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El tipo MIME o formato de archivo '{mime_type}' (.{ext}) no está permitido. Tipos permitidos: PDF, TXT, MD, DOCX."
        )

async def create_rag_document_record(
    db: AsyncSession,
    project_id: uuid.UUID,
    filename: str,
    mime_type: str,
    size_bytes: int
) -> RagDocument:
    doc = RagDocument(
        project_id=project_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=size_bytes,
        status="Indexado", # Procesado para la PoC / local
        fragment_count=max(1, size_bytes // 2048),
        ingested_at=datetime.now(timezone.utc)
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc
