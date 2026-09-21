import uuid
from typing import Tuple, Dict, Any, List, Optional
from datetime import datetime, date, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import UatSession, UatTester, UatResult, User

def compute_uat_metrics(total_testers: int, voted_testers: int, approved_votes: int) -> Tuple[float, float]:
    """
    Fórmula de métricas UAT (Req. 4.4, 4.5, Propiedad 7):
    - Participación % = (votos / total_testers_invitados) * 100
    - Aprobación UAT % = (votos_aprobados / total_votos) * 100
    """
    participation_pct = round((voted_testers / total_testers * 100.0), 2) if total_testers > 0 else 0.0
    approval_pct = round((approved_votes / voted_testers * 100.0), 2) if voted_testers > 0 else 0.0
    return min(participation_pct, 100.0), min(approval_pct, 100.0)

async def create_uat_session_record(
    db: AsyncSession,
    project_id: uuid.UUID,
    name: str,
    start_date: date,
    end_date: date,
    owner_id: uuid.UUID,
    description: Optional[str] = None
) -> UatSession:
    session = UatSession(
        project_id=project_id,
        name=name.strip(),
        description=description,
        start_date=start_date,
        end_date=end_date,
        status="Abierta",
        owner_id=owner_id
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

async def add_uat_tester_invitation(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_id: uuid.UUID
) -> UatTester:
    sess = (await db.execute(select(UatSession).where(UatSession.id == session_id))).scalars().first()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión UAT no encontrada.")

    tester = UatTester(session_id=session_id, user_id=user_id)
    db.add(tester)
    await db.commit()
    return tester

async def record_uat_vote(
    db: AsyncSession,
    session_id: uuid.UUID,
    tester_id: uuid.UUID,
    result_status: str,
    comments: Optional[str] = None
) -> UatResult:
    allowed_results = ["Aprobado", "Rechazado", "Observaciones"]
    if result_status not in allowed_results:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Resultado UAT inválido. Debe ser uno de: {', '.join(allowed_results)}"
        )

    sess = (await db.execute(select(UatSession).where(UatSession.id == session_id))).scalars().first()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión UAT no encontrada.")

    if sess.status == "Cerrada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sesión UAT está cerrada. No se permite registrar más votos."
        )

    uat_res = UatResult(
        session_id=session_id,
        tester_id=tester_id,
        result=result_status,
        comments=comments,
        recorded_at=datetime.now(timezone.utc)
    )
    db.add(uat_res)
    await db.commit()
    await db.refresh(uat_res)
    return uat_res

async def get_uat_session_summary_metrics(
    db: AsyncSession,
    session_id: uuid.UUID
) -> Dict[str, Any]:
    sess = (await db.execute(select(UatSession).where(UatSession.id == session_id))).scalars().first()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión UAT no encontrada.")

    testers = (await db.execute(select(UatTester).where(UatTester.session_id == session_id))).scalars().all()
    results = (await db.execute(select(UatResult).where(UatResult.session_id == session_id))).scalars().all()

    total_invited = len(testers)
    voted_count = len(results)
    approved_count = len([r for r in results if r.result == "Aprobado"])
    rejected_count = len([r for r in results if r.result == "Rechazado"])
    obs_count = len([r for r in results if r.result == "Observaciones"])

    part_pct, app_pct = compute_uat_metrics(total_invited, voted_count, approved_count)

    return {
        "session_id": str(session_id),
        "name": sess.name,
        "status": sess.status,
        "total_invited_testers": total_invited,
        "voted_testers_count": voted_count,
        "approved_votes": approved_count,
        "rejected_votes": rejected_count,
        "observations_votes": obs_count,
        "participation_pct": part_pct,
        "approval_pct": app_pct
    }
