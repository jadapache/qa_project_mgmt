import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.models import User
from app.core.dependencies import get_current_user, require_role
from app.services.jira_service import set_jira_config, sync_defect_to_jira
from app.services.audit_service import log_event

router = APIRouter(tags=["Integración Jira"])

@router.post("/projects/{project_id}/jira-config")
async def save_jira_config(
    project_id: uuid.UUID,
    jira_url: str,
    user_email: str,
    api_token: str,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    res = set_jira_config(str(project_id), jira_url, user_email, api_token)
    await log_event(
        db=db,
        operation_type="configuración_jira",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=project_id,
        entity_type="Project",
        result="Éxito",
        metadata={"jira_url": jira_url, "user_email": user_email}
    )
    return res

@router.post("/defects/{defect_id}/sync-jira")
async def trigger_jira_sync(
    defect_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    result = await sync_defect_to_jira(db, defect_id)
    await log_event(
        db=db,
        operation_type="sincronización_jira_defecto",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=defect_id,
        entity_type="Defect",
        result="Éxito",
        metadata={"jira_issue_key": result["jira_issue_key"]}
    )
    return result
