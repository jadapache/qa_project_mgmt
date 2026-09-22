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
    token: str
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
    )

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    token = create_access_token({"sub": user["id"], "username": user["username"]})

    return {"token": token, "user": clean_user}


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

    clean_user = {k: v for k, v in user.items() if k not in ("password_hash", "password_salt")}
    token = create_access_token({"sub": user["id"], "username": user["username"]})

    return {"token": token, "user": clean_user}


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
