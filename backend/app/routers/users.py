import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User
from app.schemas.schemas import UserResponse, UpdateRoleRequest
from app.core.dependencies import get_current_user, require_role
from app.core.security import revoke_all_user_tokens
from app.services.audit_service import log_event

router = APIRouter(prefix="/users", tags=["Usuarios"])

@router.get("", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_detail(
    user_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )
    return user

@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    role_data: UpdateRoleRequest,
    request: Request,
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    valid_roles = ["Administrador", "Líder_QA", "Analista_QA", "UAT_Tester", "Observador"]
    if role_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Rol inválido. Debe ser uno de: {', '.join(valid_roles)}"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalars().first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    previous_role = target_user.role
    target_user.role = role_data.role
    await db.commit()
    await db.refresh(target_user)

    # Invalidar todos los JWTs activos emitidos previamente para este usuario (Req. 2.4)
    await revoke_all_user_tokens(str(user_id))

    # Registrar en audit_log con rol anterior, nuevo rol y UTC timestamp (Req. 2.6)
    await log_event(
        db=db,
        operation_type="modificación_rol",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=target_user.id,
        entity_type="User",
        client_ip=client_ip,
        result="Éxito",
        metadata={
            "affected_user_id": str(target_user.id),
            "affected_username": target_user.username,
            "previous_role": previous_role,
            "new_role": target_user.role
        }
    )

    return target_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    user.is_active = False
    await db.commit()
    await revoke_all_user_tokens(str(user_id))

    await log_event(
        db=db,
        operation_type="desactivación_usuario",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=user.id,
        entity_type="User",
        result="Éxito",
        metadata={"username": user.username}
    )
    return None
