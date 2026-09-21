import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.base import get_db
from app.models.models import User, ChatSession, ChatMessage, Project
from app.core.dependencies import get_current_user, require_role
from app.services.rag_service import generate_rag_response
from app.services.audit_service import log_event

router = APIRouter(tags=["Motor RAG Chat"])

@router.post("/projects/{project_id}/chat-sessions")
async def create_chat_session(
    project_id: uuid.UUID,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Crear sesión de chat en < 3 segundos (Req. 7.1)
    session = ChatSession(
        project_id=project_id,
        user_id=current_user.id,
        status="Activa",
        started_at=datetime.now(timezone.utc)
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/chat-sessions/{session_id}/messages")
async def get_chat_history(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
    )
    return result.scalars().all()

@router.post("/chat-sessions/{session_id}/messages")
async def send_chat_message(
    session_id: uuid.UUID,
    content: str,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA", "Analista_QA"])),
    db: AsyncSession = Depends(get_db)
):
    # Verificar sesión
    sess_query = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = sess_query.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada.")

    if session.status == "Cerrada":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sesión de chat está cerrada. No se pueden enviar más mensajes." # Req. 7.10
        )

    # 1. Guardar mensaje del usuario
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=content.strip(),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(user_msg)
    await db.commit()

    # 2. Generar respuesta RAG con fuentes
    assistant_text, sources = await generate_rag_response(db, session, content.strip())

    # 3. Guardar respuesta del asistente con fuentes (Req. 7.3, 7.6)
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=assistant_text,
        rag_sources=sources,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return assistant_msg

@router.patch("/chat-sessions/{session_id}/close")
async def close_chat_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sess_query = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = sess_query.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión de chat no encontrada.")

    session.status = "Cerrada"
    session.closed_at = datetime.now(timezone.utc)
    await db.commit()
    return session
