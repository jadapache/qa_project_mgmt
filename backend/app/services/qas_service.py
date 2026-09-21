import uuid
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.models import QasCycle, Certification, TestCase, Execution, UserStory, Iteration

def compute_qas_metrics(total_tc: int, executed_tc: int, passed_tc: int) -> Tuple[float, float]:
    """
    Fórmula de Certificación de Calidad QaS (Req. 5.3, 5.4, Propiedad 6):
    - Cobertura % = (ejecutados / total) * 100
    - Aprobación % = (aprobados / ejecutados) * 100
    """
    coverage_pct = round((executed_tc / total_tc * 100.0), 2) if total_tc > 0 else 0.0
    approval_pct = round((passed_tc / executed_tc * 100.0), 2) if executed_tc > 0 else 0.0
    return min(coverage_pct, 100.0), min(approval_pct, 100.0)

async def generate_qas_certification(
    db: AsyncSession,
    cycle_id: uuid.UUID,
    user_id: uuid.UUID
) -> Certification:
    cycle = (await db.execute(select(QasCycle).where(QasCycle.id == cycle_id))).scalars().first()
    if not cycle:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ciclo QaS no encontrado.")

    # Consultar casos de prueba y ejecuciones vinculados al proyecto
    result_tc = await db.execute(
        select(TestCase)
        .join(UserStory, TestCase.story_id == UserStory.id)
        .join(Iteration, UserStory.iteration_id == Iteration.id)
        .where(Iteration.project_id == cycle.project_id)
    )
    all_tcs = result_tc.scalars().all()
    total_tc = len(all_tcs)

    executed_tcs = [tc for tc in all_tcs if tc.status in ["Aprobado", "Fallido", "Bloqueado"]]
    passed_tcs = [tc for tc in all_tcs if tc.status == "Aprobado"]

    executed_count = len(executed_tcs)
    passed_count = len(passed_tcs)

    cov_pct, app_pct = compute_qas_metrics(total_tc, executed_count, passed_count)

    # Buscar última versión de certificación
    latest_cert = (await db.execute(
        select(Certification)
        .where(Certification.cycle_id == cycle_id)
        .order_by(Certification.version.desc())
    )).scalars().first()

    next_version = (latest_cert.version + 1) if latest_cert else 1

    cert = Certification(
        cycle_id=cycle_id,
        coverage_pct=cov_pct,
        approval_pct=app_pct,
        generated_by=user_id,
        generated_at=datetime.now(timezone.utc),
        version=next_version
    )
    db.add(cert)
    await db.commit()
    await db.refresh(cert)
    return cert
