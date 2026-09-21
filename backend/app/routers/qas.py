import uuid
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, QasCycle, Certification, Project
from app.core.dependencies import get_current_user, require_role
from app.services.qas_service import generate_qas_certification
from app.services.audit_service import log_event

router = APIRouter(tags=["Certificación QaS"])

@router.post("/projects/{project_id}/qas-cycles", status_code=status.HTTP_201_CREATED)
async def create_qas_cycle(
    project_id: uuid.UUID,
    name: str,
    start_date: date,
    end_date: date,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    cycle = QasCycle(
        project_id=project_id,
        name=name.strip(),
        start_date=start_date,
        end_date=end_date,
        status="Activo"
    )
    db.add(cycle)
    await db.commit()
    await db.refresh(cycle)

    await log_event(
        db=db,
        operation_type="creación_ciclo_qas",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=cycle.id,
        entity_type="QasCycle",
        result="Éxito",
        metadata={"name": cycle.name, "project_id": str(project_id)}
    )
    return cycle

@router.get("/projects/{project_id}/qas-cycles")
async def list_qas_cycles(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(QasCycle).where(QasCycle.project_id == project_id))
    return result.scalars().all()

@router.post("/qas-cycles/{cycle_id}/certifications", status_code=status.HTTP_201_CREATED)
async def create_certification(
    cycle_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    cert = await generate_qas_certification(db, cycle_id, current_user.id)
    await log_event(
        db=db,
        operation_type="generación_certificación_qas",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=cert.id,
        entity_type="Certification",
        result="Éxito",
        metadata={"version": cert.version, "coverage_pct": cert.coverage_pct, "approval_pct": cert.approval_pct}
    )
    return cert

@router.get("/qas-cycles/{cycle_id}/certifications")
async def list_cycle_certifications(
    cycle_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Certification)
        .where(Certification.cycle_id == cycle_id)
        .order_by(Certification.version.desc())
    )
    return result.scalars().all()
