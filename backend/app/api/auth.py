from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_user_repository
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.interfaces import IUserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=4)
    email: str = ""
    full_name: str = ""
    role: str = "user"


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class AuthResponse(BaseModel):
    token: str | None = None
    status: str = "approved"
    message: str = ""
    user: dict[str, Any]


@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    existing = await user_repo.get_by_username(body.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El usuario '{body.username}' ya está registrado.",
        )

    # Apply SHA-256 + Salt hashing
    pwd_hash, pwd_salt = hash_password(body.password)

    user = await user_repo.create_user_with_password(
        username=body.username,
        password_hash=pwd_hash,
        password_salt=pwd_salt,
        email=body.email,
        full_name=body.full_name or body.username,
        role=body.role,
        status="pending",
    )

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    user_status = user.get("status", "pending")

    if user_status == "approved":
        token = create_access_token({"sub": user["id"], "username": user["username"]})
        return {
            "token": token,
            "status": "approved",
            "message": "Cuenta creada y aprobada automáticamente como Administrador.",
            "user": clean_user,
        }

    return {
        "token": None,
        "status": "pending",
        "message": "Solicitud de acceso enviada correctamente. Un administrador debe aprobar tu cuenta antes de que puedas ingresar.",
        "user": clean_user,
    }


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    user = await user_repo.get_by_username(body.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos.",
        )

    pwd_hash = user.get("password_hash")
    pwd_salt = user.get("password_salt")

    # If legacy user created without password, allow setting initial password or check hash
    if not pwd_hash or not pwd_salt:
        new_hash, new_salt = hash_password(body.password)
        await user_repo.update(user["id"], {"password_hash": new_hash, "password_salt": new_salt})
        pwd_hash, pwd_salt = new_hash, new_salt

    if not verify_password(body.password, pwd_hash, pwd_salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos.",
        )

    user_status = user.get("status", "approved")
    if user_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu solicitud de acceso está pendiente de aprobación por el administrador.",
        )
    elif user_status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu solicitud de acceso ha sido rechazada por el administrador.",
        )

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    token = create_access_token({"sub": user["id"], "username": user["username"]})

    return {"token": token, "status": user_status, "message": "Inicio de sesión exitoso.", "user": clean_user}


@router.get("/me")
async def get_me(
    authorization: str | None = Header(default=None),
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autorización.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "username" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        )

    user = await user_repo.get_by_username(payload["username"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    return {"user": clean_user}


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None
    password: str | None = None


@router.put("/me")
async def update_me(
    body: UpdateProfileRequest,
    authorization: str | None = Header(default=None),
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autorización.",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "username" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
        )

    user = await user_repo.get_by_username(payload["username"])
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    updates: dict[str, Any] = {}
    if body.full_name is not None and body.full_name.strip():
        updates["full_name"] = body.full_name.strip()
    if body.email is not None and body.email.strip():
        updates["email"] = body.email.strip()
    if body.password is not None and body.password.strip():
        pwd_hash, pwd_salt = hash_password(body.password.strip())
        updates["password_hash"] = pwd_hash
        updates["password_salt"] = pwd_salt

    if updates:
        updated = await user_repo.update(user["id"], updates)
        if updated:
            user = updated

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    return {"message": "Perfil actualizado exitosamente.", "user": clean_user}


@router.get("/access-requests")
async def get_access_requests(
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    pending = await user_repo.get_pending_users()
    clean_pending = [{k: v for k, v in u.items() if k not in ("password_hash", "password_salt")} for u in pending]
    return {"requests": clean_pending}


@router.post("/access-requests/{user_id}/approve")
async def approve_access_request(
    user_id: str,
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
    updated = await user_repo.update_user_status(user_id, "approved")
    clean_user = {k: v for k, v in (updated or {}).items() if k not in ("password_hash", "password_salt")}
    return {"status": "approved", "user": clean_user}


@router.post("/access-requests/{user_id}/reject")
async def reject_access_request(
    user_id: str,
    user_repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")
    updated = await user_repo.update_user_status(user_id, "rejected")
    clean_user = {k: v for k, v in (updated or {}).items() if k not in ("password_hash", "password_salt")}
    return {"status": "rejected", "user": clean_user}

