import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, DocTemplate, VersionedDocument, Project
from app.core.dependencies import get_current_user, require_role
from app.services.audit_service import log_event

router = APIRouter(tags=["Generación Documental"])

@router.get("/doc-templates")
async def list_doc_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(DocTemplate).where(DocTemplate.status == "Activa"))
    return result.scalars().all()

@router.post("/doc-templates", status_code=status.HTTP_201_CREATED)
async def create_doc_template(
    name: str,
    description: Optional[str],
    content: str,
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    template = DocTemplate(
        name=name.strip(),
        description=description,
        content=content,
        version=1,
        status="Activa"
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template

@router.post("/projects/{project_id}/documents", status_code=status.HTTP_201_CREATED)
async def generate_versioned_document(
    project_id: uuid.UUID,
    template_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Verificar plantilla
    tpl_query = await db.execute(select(DocTemplate).where(DocTemplate.id == template_id))
    template = tpl_query.scalars().first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla documental no encontrada.")

    if template.status == "Obsoleta": # Req. 6.4
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La plantilla documental seleccionada está Obsoleta. Seleccione una plantilla activa."
        )

    # Verificar proyecto
    proj_query = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_query.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado.")

    # Calcular siguiente número de versión
    latest_query = await db.execute(
        select(VersionedDocument)
        .where(VersionedDocument.project_id == project_id, VersionedDocument.template_id == template_id)
        .order_by(VersionedDocument.version.desc())
    )
    latest_doc = latest_query.scalars().first()
    next_version = (latest_doc.version + 1) if latest_doc else 1

    # Generar contenido combinado
    doc_content = (
        f"# {template.name} - {project.name}\n"
        f"**Versión:** {next_version} | **Fecha:** {datetime.now(timezone.utc).strftime('%Y-%m-%d')}\n\n"
        f"{template.content}\n\n"
        f"---\n*Generado automáticamente por el Sistema QA Project Mgmt.*"
    )

    doc = VersionedDocument(
        template_id=template_id,
        project_id=project_id,
        version=next_version,
        content=doc_content,
        status="Borrador",
        generated_by=current_user.id,
        generated_at=datetime.now(timezone.utc)
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    await log_event(
        db=db,
        operation_type="generación_documento",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=doc.id,
        entity_type="VersionedDocument",
        result="Éxito",
        metadata={"version": doc.version, "project_id": str(project_id)}
    )

    return doc

@router.get("/projects/{project_id}/documents")
async def list_project_documents(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(VersionedDocument)
        .where(VersionedDocument.project_id == project_id)
        .order_by(VersionedDocument.generated_at.desc())
    )
    return result.scalars().all()

@router.patch("/documents/{document_id}/approve")
async def approve_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VersionedDocument).where(VersionedDocument.id == document_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado.")

    doc.status = "Aprobado"
    doc.approved_by = current_user.id
    doc.approved_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(
        db=db,
        operation_type="aprobación_documento",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=doc.id,
        entity_type="VersionedDocument",
        result="Éxito"
    )

    return doc

@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(VersionedDocument).where(VersionedDocument.id == document_id))
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado.")

    return Response(
        content=doc.content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=document_v{doc.version}_{doc.id.hex[:6]}.md"}
    )
