import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, UatSession, UatResult
from app.core.dependencies import get_current_user, require_role
from app.services.uat_service import (
    create_uat_session_record,
    add_uat_tester_invitation,
    record_uat_vote,
    get_uat_session_summary_metrics
)
from app.services.audit_service import log_event

router = APIRouter(tags=["Pruebas UAT"])

@router.post("/projects/{project_id}/uat-sessions", status_code=status.HTTP_201_CREATED)
async def create_uat_session(
    project_id: uuid.UUID,
    name: str,
    start_date: date,
    end_date: date,
    description: Optional[str] = None,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    session = await create_uat_session_record(
        db=db,
        project_id=project_id,
        name=name,
        start_date=start_date,
        end_date=end_date,
        owner_id=current_user.id,
        description=description
    )
    await log_event(
        db=db,
        operation_type="creación_sesión_uat",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=session.id,
        entity_type="UatSession",
        result="Éxito",
        metadata={"name": session.name, "project_id": str(project_id)}
    )
    return session

@router.get("/projects/{project_id}/uat-sessions")
async def list_uat_sessions(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UatSession).where(UatSession.project_id == project_id))
    return result.scalars().all()

@router.post("/uat-sessions/{session_id}/testers", status_code=status.HTTP_201_CREATED)
async def invite_uat_tester(
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    tester = await add_uat_tester_invitation(db, session_id, user_id)
    await log_event(
        db=db,
        operation_type="invitación_tester_uat",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=session_id,
        entity_type="UatSession",
        result="Éxito",
        metadata={"invited_user_id": str(user_id)}
    )
    return {"status": "success", "session_id": str(session_id), "user_id": str(user_id)}

@router.post("/uat-sessions/{session_id}/results", status_code=status.HTTP_201_CREATED)
async def submit_uat_result(
    session_id: uuid.UUID,
    result_status: str,
    comments: Optional[str] = None,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "UAT_Tester"])),
    db: AsyncSession = Depends(get_db)
):
    result = await record_uat_vote(
        db=db,
        session_id=session_id,
        tester_id=current_user.id,
        result_status=result_status,
        comments=comments
    )
    await log_event(
        db=db,
        operation_type="voto_resultado_uat",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=session_id,
        entity_type="UatSession",
        result="Éxito",
        metadata={"vote": result_status}
    )
    return result

@router.get("/uat-sessions/{session_id}/summary")
async def get_uat_session_summary(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await get_uat_session_summary_metrics(db, session_id)
