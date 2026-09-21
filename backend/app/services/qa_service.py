import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import TestCase, Execution, Evidence, Defect, UserStory
from app.services.audit_service import log_event

def validate_evidence_file(mime_type: str, size_bytes: int) -> None:
    allowed_mimes = ["image/png", "image/jpeg", "application/pdf", "text/plain", "video/mp4"]
    if mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tipo de archivo de evidencia no soportado '{mime_type}'. Debe ser PNG, JPEG, PDF, TXT o MP4."
        )
    max_bytes = 10 * 1024 * 1024 # 10MB limit
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El archivo de evidencia ({size_bytes} bytes) supera el límite máximo permitido de 10 MB."
        )

async def create_test_case_record(
    db: AsyncSession,
    story_id: uuid.UUID,
    title: str,
    preconditions: Optional[str] = None,
    steps: Optional[List[Dict[str, Any]]] = None,
    input_data: Optional[str] = None,
    expected_result: Optional[str] = None
) -> TestCase:
    story = (await db.execute(select(UserStory).where(UserStory.id == story_id))).scalars().first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Historia de usuario no encontrada.")

    tc = TestCase(
        story_id=story_id,
        title=title.strip(),
        preconditions=preconditions,
        steps=steps or [],
        input_data=input_data,
        expected_result=expected_result,
        status="Diseño"
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc

async def record_execution(
    db: AsyncSession,
    test_case_id: uuid.UUID,
    analyst_id: uuid.UUID,
    result_status: str,
    comments: Optional[str] = None
) -> Execution:
    allowed_results = ["Aprobado", "Fallido", "Bloqueado", "No_Ejecutado"]
    if result_status not in allowed_results:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Resultado de ejecución inválido. Debe ser uno de: {', '.join(allowed_results)}"
        )

    tc = (await db.execute(select(TestCase).where(TestCase.id == test_case_id))).scalars().first()
    if not tc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso de prueba no encontrado.")

    execution = Execution(
        test_case_id=test_case_id,
        analyst_id=analyst_id,
        result=result_status,
        comments=comments,
        executed_at=datetime.now(timezone.utc)
    )
    db.add(execution)

    # Actualizar estado del caso de prueba
    if result_status == "Aprobado":
        tc.status = "Aprobado"
    elif result_status == "Fallido":
        tc.status = "Fallido"
    elif result_status == "Bloqueado":
        tc.status = "Bloqueado"

    await db.commit()
    await db.refresh(execution)
    return execution

async def add_evidence_record(
    db: AsyncSession,
    execution_id: uuid.UUID,
    file_path: str,
    mime_type: str,
    size_bytes: int
) -> Evidence:
    validate_evidence_file(mime_type, size_bytes)
    exec_record = (await db.execute(select(Execution).where(Execution.id == execution_id))).scalars().first()
    if not exec_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ejecución no encontrada.")

    evidence = Evidence(
        execution_id=execution_id,
        file_path=file_path,
        mime_type=mime_type,
        size_bytes=size_bytes,
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    return evidence

async def create_defect_record(
    db: AsyncSession,
    execution_id: uuid.UUID,
    title: str,
    description: Optional[str] = None,
    steps_to_reproduce: Optional[str] = None,
    severity: str = "Media"
) -> Defect:
    exec_record = (await db.execute(select(Execution).where(Execution.id == execution_id))).scalars().first()
    if not exec_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ejecución no encontrada.")

    defect = Defect(
        execution_id=execution_id,
        title=title.strip(),
        description=description,
        steps_to_reproduce=steps_to_reproduce,
        severity=severity,
        status="Abierto",
        created_at=datetime.now(timezone.utc)
    )
    db.add(defect)
    await db.commit()
    await db.refresh(defect)
    return defect
