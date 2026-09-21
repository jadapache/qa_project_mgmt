import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.base import get_db
from app.models.models import User, Project, ProjectMember
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.dependencies import get_current_user, require_role
from app.services.audit_service import log_event

router = APIRouter(prefix="/projects", tags=["Proyectos"])

@router.get("", response_model=List[ProjectResponse])
async def list_user_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Administrador ve todos los proyectos; los demás ven proyectos asignados u propios (Req. 3.10)
    if current_user.role == "Administrador":
        result = await db.execute(select(Project).order_by(Project.created_at.desc()))
        return result.scalars().all()

    # Proyectos donde es owner o miembro
    member_subquery = select(ProjectMember.project_id).where(ProjectMember.user_id == current_user.id)
    query = select(Project).where(
        or_(Project.owner_id == current_user.id, Project.id.in_(member_subquery))
    ).order_by(Project.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    request: Request,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None

    # Validar fecha fin posterior o igual a fecha inicio (Req. 3.2)
    if project_data.end_date_estimated < project_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de fin estimada no puede ser anterior a la fecha de inicio."
        )

    # Validar nombre único (Req. 3.3)
    existing = await db.execute(select(Project).where(Project.name == project_data.name.strip()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un proyecto con el nombre '{project_data.name.strip()}'."
        )

    new_project = Project(
        name=project_data.name.strip(),
        description=project_data.description,
        start_date=project_data.start_date,
        end_date_estimated=project_data.end_date_estimated,
        status="Activo",
        owner_id=current_user.id
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)

    await log_event(
        db=db,
        operation_type="creación_proyecto",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=new_project.id,
        entity_type="Project",
        client_ip=client_ip,
        result="Éxito",
        metadata={"project_name": new_project.name}
    )

    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_detail(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado."
        )

    # Verificar acceso
    if current_user.role != "Administrador" and project.owner_id != current_user.id:
        member = await db.execute(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id))
        if not member.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permiso para acceder a este proyecto."
            )

    return project

@router.patch("/{project_id}/status", response_model=ProjectResponse)
async def change_project_status(
    project_id: uuid.UUID,
    new_status: str,
    request: Request,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    valid_statuses = ["Activo", "Suspendido", "Cerrado"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_statuses)}"
        )

    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalars().first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proyecto no encontrado."
        )

    previous_status = project.status
    project.status = new_status
    await db.commit()
    await db.refresh(project)

    await log_event(
        db=db,
        operation_type="cambio_estado_proyecto",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=project.id,
        entity_type="Project",
        client_ip=client_ip,
        result="Éxito",
        metadata={"previous_status": previous_status, "new_status": new_status}
    )

    return project
