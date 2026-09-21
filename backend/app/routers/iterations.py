import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, Project, Iteration
from app.schemas.schemas import IterationCreate, IterationResponse
from app.core.dependencies import get_current_user, require_role
from app.services.audit_service import log_event

router = APIRouter(tags=["Iteraciones"])

@router.get("/projects/{project_id}/iterations", response_model=List[IterationResponse])
async def list_iterations(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Iteration).where(Iteration.project_id == project_id).order_by(Iteration.start_date.desc()))
    return result.scalars().all()

@router.post("/projects/{project_id}/iterations", response_model=IterationResponse, status_code=status.HTTP_201_CREATED)
async def create_iteration(
    project_id: uuid.UUID,
    iteration_data: IterationCreate,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Verificar proyecto
    proj_query = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_query.scalars().first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proyecto no encontrado.")

    # Reject si el proyecto está Suspendido o Cerrado (Req. 3.6)
    if project.status in ["Suspendido", "Cerrado"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"No se pueden crear iteraciones en un proyecto con estado '{project.status}'."
        )

    # Validar fecha fin posterior a fecha inicio (Req. 3.5)
    if iteration_data.end_date < iteration_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de fin de la iteración no puede ser anterior a la fecha de inicio."
        )

    iteration = Iteration(
        project_id=project_id,
        name=iteration_data.name.strip(),
        start_date=iteration_data.start_date,
        end_date=iteration_data.end_date,
        status="Planificada"
    )
    db.add(iteration)
    await db.commit()
    await db.refresh(iteration)

    await log_event(
        db=db,
        operation_type="creación_iteración",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=iteration.id,
        entity_type="Iteration",
        result="Éxito",
        metadata={"name": iteration.name, "project_id": str(project_id)}
    )

    return iteration
