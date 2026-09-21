import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, LoginAttempt
from app.schemas.schemas import LoginRequest, TokenResponse, RegisterUserRequest, UserResponse, ChangePasswordRequest
from app.core.security import (
    hash_password, verify_password, validate_password_policy,
    create_access_token, revoke_token, decode_access_token
)
from app.core.dependencies import get_current_user, require_role
from app.core.rate_limiter import limiter
from app.services.audit_service import log_event

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    username = login_data.username.strip()

    # Comprobar si el usuario está bloqueado por intentos fallidos (Req. 1.3)
    now = datetime.now(timezone.utc)
    attempt_query = await db.execute(select(LoginAttempt).where(LoginAttempt.username == username))
    attempt_record = attempt_query.scalars().first()

    if attempt_record and attempt_record.locked_until:
        locked_until = attempt_record.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
            
        if now < locked_until:
            await log_event(
                db=db,
                operation_type="autenticación_fallida_bloqueado",
                client_ip=client_ip,
                result="Error_Bloqueo",
                metadata={"username": username}
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Nombre de usuario bloqueado temporalmente por 15 minutos."
            )

    # Buscar usuario
    user_query = await db.execute(select(User).where(User.username == username, User.is_active == True))
    user = user_query.scalars().first()

    if not user or not verify_password(login_data.password, user.password_hash):
        # Registrar intento fallido
        window_start = now - timedelta(minutes=10)
        if not attempt_record or attempt_record.window_start < window_start:
            if not attempt_record:
                attempt_record = LoginAttempt(username=username, attempt_count=1, window_start=now)
                db.add(attempt_record)
            else:
                attempt_record.attempt_count = 1
                attempt_record.window_start = now
                attempt_record.locked_until = None
        else:
            attempt_record.attempt_count += 1

        # Si llega a 5 intentos fallidos consecutivas en 10 minutos -> bloquear 15 min (Req. 1.3)
        if attempt_record.attempt_count >= 5:
            attempt_record.locked_until = now + timedelta(minutes=15)

        await db.commit()
        await log_event(
            db=db,
            operation_type="autenticación_fallida",
            client_ip=client_ip,
            result="Error",
            metadata={"username": username, "intentos": attempt_record.attempt_count}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales de acceso inválidas." # Mensaje genérico (Req. 1.2)
        )

    # Login exitoso -> resetear contador de intentos
    if attempt_record:
        attempt_record.attempt_count = 0
        attempt_record.locked_until = None
        await db.commit()

    # Generar JWT con rol en payload (Req. 1.1, 1.11)
    token, jti, expires_at = create_access_token({"sub": str(user.id), "username": user.username, "role": user.role})

    await log_event(
        db=db,
        operation_type="autenticación_exitosa",
        user_id=user.id,
        user_role=user.role,
        client_ip=client_ip,
        result="Éxito"
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_seconds=28800,
        role=user.role,
        username=user.username
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_access_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                await revoke_token(jti, expires_at)
        except Exception:
            pass

    await log_event(
        db=db,
        operation_type="cierre_sesión",
        user_id=current_user.id,
        user_role=current_user.role,
        client_ip=client_ip,
        result="Éxito"
    )
    return {"message": "Sesión cerrada exitosamente."}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: RegisterUserRequest,
    current_user: User = Depends(require_role(["Administrador"])),
    db: AsyncSession = Depends(get_db)
):
    # Validar política de contraseña (Req. 1.10)
    is_valid, error_msg = validate_password_policy(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_msg
        )

    # Validar rol único permitido (Req. 2.2)
    valid_roles = ["Administrador", "Líder_QA", "Analista_QA", "UAT_Tester", "Observador"]
    if user_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Rol inválido. Debe ser uno de: {', '.join(valid_roles)}"
        )

    # Verificar si el usuario ya existe
    existing = await db.execute(select(User).where(User.username == user_data.username.strip()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre de usuario ya está registrado."
        )

    new_user = User(
        username=user_data.username.strip(),
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_event(
        db=db,
        operation_type="creación_usuario",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=new_user.id,
        entity_type="User",
        result="Éxito",
        metadata={"created_username": new_user.username, "role": new_user.role}
    )

    return new_user
