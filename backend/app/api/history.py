from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import (
    get_chat_repository,
    get_prd_repository,
    get_settings_repository,
    get_standup_repository,
    get_test_plan_repository,
    get_user_repository,
)
from app.db.interfaces import (
    IChatRepository,
    IPRDRepository,
    ISettingsRepository,
    IStandupRepository,
    ITestPlanRepository,
    IUserRepository,
)

router = APIRouter(tags=["db-history"])


class UserCreate(BaseModel):
    username: str = Field(min_length=1)
    email: str = ""
    full_name: str = ""
    role: str = "user"


class ChatMessageCreate(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1)
    context_sources: Optional[List[dict[str, Any]]] = None


class SettingSetRequest(BaseModel):
    key: str = Field(min_length=1)
    value: Any


# --- Users Endpoints ---
@router.get("/users")
async def get_users(repo: IUserRepository = Depends(get_user_repository)) -> dict[str, Any]:
    users = await repo.get_all()
    return {"users": users}


@router.post("/users")
async def create_new_user(
    body: UserCreate,
    repo: IUserRepository = Depends(get_user_repository),
) -> dict[str, Any]:
    existing = await repo.get_by_username(body.username)
    if existing:
        raise HTTPException(status_code=400, detail=f"User {body.username} already exists.")
    user = await repo.create_user(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        role=body.role,
    )
    return {"user": user}


# --- Settings Endpoints (SQLite) ---
@router.get("/db/settings")
async def get_db_settings(repo: ISettingsRepository = Depends(get_settings_repository)) -> dict[str, Any]:
    all_settings = await repo.get_all_settings()
    return {"settings": all_settings}


@router.post("/db/settings")
async def set_db_setting(
    body: SettingSetRequest,
    repo: ISettingsRepository = Depends(get_settings_repository),
) -> dict[str, Any]:
    await repo.set_setting(body.key, body.value)
    return {"ok": True, "key": body.key, "value": body.value}


# --- Chat History Endpoints ---
@router.get("/chat/history/{session_id}")
async def get_chat_messages(
    session_id: str,
    limit: int = 50,
    repo: IChatRepository = Depends(get_chat_repository),
) -> dict[str, Any]:
    history = await repo.get_session_messages(session_id, limit=limit)
    return {"session_id": session_id, "messages": history}


@router.post("/chat/history/{session_id}")
async def post_chat_message(
    session_id: str,
    body: ChatMessageCreate,
    repo: IChatRepository = Depends(get_chat_repository),
) -> dict[str, Any]:
    message = await repo.save_message(
        session_id=session_id,
        role=body.role,
        content=body.content,
        context_sources=body.context_sources,
    )
    return {"message": message}


@router.delete("/chat/history/{session_id}")
async def delete_chat_messages(
    session_id: str,
    repo: IChatRepository = Depends(get_chat_repository),
) -> dict[str, Any]:
    await repo.clear_session(session_id)
    return {"ok": True, "session_id": session_id}


# --- Feature History Endpoints ---
@router.get("/history/standups")
async def get_standup_history(
    limit: int = 20,
    repo: IStandupRepository = Depends(get_standup_repository),
) -> dict[str, Any]:
    items = await repo.get_all_standups(limit=limit)
    return {"standups": items}


@router.get("/history/prd-reviews")
async def get_prd_history(
    limit: int = 20,
    repo: IPRDRepository = Depends(get_prd_repository),
) -> dict[str, Any]:
    items = await repo.get_all_prd_reviews(limit=limit)
    return {"prd_reviews": items}


@router.get("/history/test-plans")
async def get_test_plan_history(
    limit: int = 20,
    repo: ITestPlanRepository = Depends(get_test_plan_repository),
) -> dict[str, Any]:
    items = await repo.get_all_test_plans(limit=limit)
    return {"test_plans": items}
