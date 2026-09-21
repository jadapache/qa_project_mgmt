import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, Iteration, UserStory
from app.schemas.schemas import UserStoryCreate, UserStoryResponse
from app.core.dependencies import get_current_user, require_role
from app.services.audit_service import log_event

router = APIRouter(tags=["Historias de Usuario"])

@router.get("/iterations/{iteration_id}/stories", response_model=List[UserStoryResponse])
async def list_stories(
    iteration_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserStory).where(UserStory.iteration_id == iteration_id).order_by(UserStory.created_at.desc()))
    return result.scalars().all()

@router.post("/iterations/{iteration_id}/stories", response_model=UserStoryResponse, status_code=status.HTTP_201_CREATED)
async def create_user_story(
    iteration_id: uuid.UUID,
    story_data: UserStoryCreate,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Verificar iteración
    iter_query = await db.execute(select(Iteration).where(Iteration.id == iteration_id))
    iteration = iter_query.scalars().first()
    if not iteration:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Iteración no encontrada.")

    # Reject si la iteración está Finalizada (Req. 3.8)
    if iteration.status == "Finalizada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pueden crear historias en una iteración con estado 'Finalizada'."
        )

    # Validar prioridad (Alta / Media / Baja)
    valid_priorities = ["Alta", "Media", "Baja"]
    if story_data.priority not in valid_priorities:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Prioridad inválida. Debe ser una de: {', '.join(valid_priorities)}"
        )

    story = UserStory(
        iteration_id=iteration_id,
        description=story_data.description.strip(),
        acceptance_criteria=story_data.acceptance_criteria,
        priority=story_data.priority,
        status="Pendiente"
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)

    await log_event(
        db=db,
        operation_type="creación_historia_usuario",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=story.id,
        entity_type="UserStory",
        result="Éxito",
        metadata={"iteration_id": str(iteration_id)}
    )

    return story
