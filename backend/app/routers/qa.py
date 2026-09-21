import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, join

from app.db.base import get_db
from app.models.models import User, TestCase as TestCaseModel, Execution, Evidence, Defect, UserStory, Iteration
from app.core.dependencies import get_current_user, require_role
from app.services.qa_service import (
    create_test_case_record,
    record_execution,
    add_evidence_record,
    create_defect_record
)
from app.services.audit_service import log_event

router = APIRouter(tags=["Gestión de Pruebas QA & Defectos"])

@router.post("/stories/{story_id}/test-cases", status_code=status.HTTP_201_CREATED)
async def create_test_case(
    story_id: uuid.UUID,
    title: str,
    preconditions: Optional[str] = None,
    input_data: Optional[str] = None,
    expected_result: Optional[str] = None,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    tc = await create_test_case_record(
        db=db,
        story_id=story_id,
        title=title,
        preconditions=preconditions,
        input_data=input_data,
        expected_result=expected_result
    )
    await log_event(
        db=db,
        operation_type="creación_caso_prueba",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=tc.id,
        entity_type="TestCase",
        result="Éxito",
        metadata={"title": tc.title, "story_id": str(story_id)}
    )
    return tc

@router.get("/stories/{story_id}/test-cases")
async def list_story_test_cases(
    story_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TestCaseModel).where(TestCaseModel.story_id == story_id))
    return result.scalars().all()

@router.post("/test-cases/{test_case_id}/executions", status_code=status.HTTP_201_CREATED)
async def execute_test_case(
    test_case_id: uuid.UUID,
    result_status: str,
    comments: Optional[str] = None,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    execution = await record_execution(
        db=db,
        test_case_id=test_case_id,
        analyst_id=current_user.id,
        result_status=result_status,
        comments=comments
    )
    await log_event(
        db=db,
        operation_type="ejecución_prueba",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=execution.id,
        entity_type="Execution",
        result="Éxito",
        metadata={"result": result_status, "test_case_id": str(test_case_id)}
    )
    return execution

@router.get("/test-cases/{test_case_id}/executions")
async def list_test_case_executions(
    test_case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Execution)
        .where(Execution.test_case_id == test_case_id)
        .order_by(Execution.executed_at.desc())
    )
    return result.scalars().all()

@router.post("/executions/{execution_id}/evidences", status_code=status.HTTP_201_CREATED)
async def upload_execution_evidence(
    execution_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    file_bytes = await file.read()
    size_bytes = len(file_bytes)
    mime_type = file.content_type or "application/octet-stream"
    file_path = f"/storage/evidences/{uuid.uuid4().hex}_{file.filename}"

    evidence = await add_evidence_record(
        db=db,
        execution_id=execution_id,
        file_path=file_path,
        mime_type=mime_type,
        size_bytes=size_bytes
    )
    await log_event(
        db=db,
        operation_type="carga_evidencia",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=evidence.id,
        entity_type="Evidence",
        result="Éxito",
        metadata={"filename": file.filename, "size_bytes": size_bytes}
    )
    return evidence

@router.post("/executions/{execution_id}/defects", status_code=status.HTTP_201_CREATED)
async def create_defect(
    execution_id: uuid.UUID,
    title: str,
    description: Optional[str] = None,
    steps_to_reproduce: Optional[str] = None,
    severity: str = "Media",
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    defect = await create_defect_record(
        db=db,
        execution_id=execution_id,
        title=title,
        description=description,
        steps_to_reproduce=steps_to_reproduce,
        severity=severity
    )
    await log_event(
        db=db,
        operation_type="registro_defecto",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=defect.id,
        entity_type="Defect",
        result="Éxito",
        metadata={"title": defect.title, "severity": severity}
    )
    return defect

@router.get("/projects/{project_id}/defects")
async def list_project_defects(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Defect)
        .join(Execution, Defect.execution_id == Execution.id)
        .join(TestCaseModel, Execution.test_case_id == TestCaseModel.id)
        .join(UserStory, TestCaseModel.story_id == UserStory.id)
        .join(Iteration, UserStory.iteration_id == Iteration.id)
        .where(Iteration.project_id == project_id)
        .order_by(Defect.created_at.desc())
    )
    return result.scalars().all()
