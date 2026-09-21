import uuid
from typing import List, Callable
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.models.models import User
from app.core.security import decode_access_token, is_token_revoked, is_user_token_invalidated_by_role_change

security_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        jti: str = payload.get("jti")
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        iat: float = payload.get("iat", 0)

        if not jti or not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de autenticación inválidas."
            )

        # Verificar si el token fue revocado individualmente (Req. 1.7)
        if await is_token_revoked(jti):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión revocada o expirada."
            )

        # Verificar si el usuario sufrió invalidación masiva por cambio de rol (Req. 2.4)
        if await is_user_token_invalidated_by_role_change(user_id, iat):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="El rol del usuario ha sido modificado. Vuelva a iniciar sesión."
            )

        user_uuid = uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id
        result = await db.execute(select(User).where(User.id == user_uuid, User.is_active == True))
        user = result.scalars().first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo."
            )

        return user

    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado."
        )

def require_role(allowed_roles: List[str]) -> Callable:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Observador solo lectura (Req. 2.7)
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para realizar esta operación."
            )
        return current_user

    return role_checker
