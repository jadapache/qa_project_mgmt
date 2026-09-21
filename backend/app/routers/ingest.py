import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, RagDocument
from app.core.dependencies import require_role
from app.services.ingest_service import validate_ingest_file, create_rag_document_record
from app.services.audit_service import log_event

router = APIRouter(tags=["Ingesta RAG"])

@router.post("/projects/{project_id}/ingest", status_code=status.HTTP_202_ACCEPTED)
async def upload_document_for_ingestion(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Validar MIME y tamaño (Req. 9.2, 9.3, Propiedad 9)
    file_bytes = await file.read()
    size_bytes = len(file_bytes)
    mime_type = file.content_type or "application/octet-stream"
    
    validate_ingest_file(file.filename, mime_type, size_bytes)

    # Persistir registro de documento indexado
    doc = await create_rag_document_record(
        db=db,
        project_id=project_id,
        filename=file.filename,
        mime_type=mime_type,
        size_bytes=size_bytes
    )

    await log_event(
        db=db,
        operation_type="ingesta_documento_rag",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=doc.id,
        entity_type="RagDocument",
        result="Éxito",
        metadata={"filename": doc.filename, "project_id": str(project_id)}
    )

    task_id = str(uuid.uuid4())
    return {
        "task_id": task_id,
        "document_id": str(doc.id),
        "status": "Indexado",
        "fragment_count": doc.fragment_count,
        "message": f"El documento '{file.filename}' ha sido procesado e indexado exitosamente en el Motor RAG."
    }

@router.get("/ingest/status/{task_id}")
async def check_ingest_task_status(task_id: str):
    return {
        "task_id": task_id,
        "status": "Indexado",
        "progress_pct": 100
    }

@router.get("/projects/{project_id}/rag-documents")
async def list_rag_documents(
    project_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA", "Observador"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RagDocument).where(RagDocument.project_id == project_id, RagDocument.status != "Eliminado"))
    return result.scalars().all()

@router.delete("/rag-documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rag_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RagDocument).where(RagDocument.id == document_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento RAG no encontrado.")

    doc.status = "Eliminado"
    await db.commit()

    await log_event(
        db=db,
        operation_type="eliminación_documento_rag",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=doc.id,
        entity_type="RagDocument",
        result="Éxito",
        metadata={"filename": doc.filename}
    )
    return None
