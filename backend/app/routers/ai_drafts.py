import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, AiDraft
from app.core.dependencies import get_current_user, require_role
from app.services.audit_service import log_event

router = APIRouter(tags=["Borradores IA"])

@router.get("/projects/{project_id}/ai-drafts")
async def list_ai_drafts(
    project_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AiDraft).where(AiDraft.project_id == project_id).order_by(AiDraft.created_at.desc()))
    return result.scalars().all()

@router.get("/ai-drafts/{draft_id}")
async def get_ai_draft_detail(
    draft_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AiDraft).where(AiDraft.id == draft_id))
    draft = result.scalars().first()
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador IA no encontrado.")
    return draft

@router.patch("/ai-drafts/{draft_id}")
async def edit_ai_draft(
    draft_id: uuid.UUID,
    edited_content: str,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AiDraft).where(AiDraft.id == draft_id))
    draft = result.scalars().first()
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador IA no encontrado.")

    if draft.status == "Aprobado":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El borrador IA ya ha sido aprobado y no se puede modificar.")

    # Inmutabilidad del original_content (Req. 8.3, Propiedad 12)
    draft.edited_content = edited_content.strip()
    await db.commit()

    await log_event(
        db=db,
        operation_type="edición_borrador_ia",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=draft.id,
        entity_type="AiDraft",
        result="Éxito"
    )

    return draft

@router.patch("/ai-drafts/{draft_id}/approve")
async def approve_ai_draft(
    draft_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AiDraft).where(AiDraft.id == draft_id))
    draft = result.scalars().first()
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrador IA no encontrado.")

    draft.status = "Aprobado"
    draft.approved_by = current_user.id
    draft.approved_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(
        db=db,
        operation_type="aprobación_borrador_ia",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=draft.id,
        entity_type="AiDraft",
        result="Éxito"
    )

    return draft
