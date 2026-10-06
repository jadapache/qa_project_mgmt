from __future__ import annotations

import uuid
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

from app.db.database import get_db
from app.schemas.levantamiento import (
    ImportProposalsRequest,
    LevantamientoSessionCreate,
    LevantamientoSessionResponse,
    StoryProposalResponse,
    StoryProposalUpdate,
)
from app.services.levantamiento_service import process_levantamiento_session

router = APIRouter(prefix="/levantamientos", tags=["levantamientos"])


@router.post("", response_model=LevantamientoSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_levantamiento(payload: LevantamientoSessionCreate, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO levantamiento_sessions 
            (id, project_id, status, source_label, transcript, llm_model)
            VALUES (?, ?, 'Transcrito', ?, ?, ?)
            """,
            (
                session_id,
                payload.project_id,
                payload.source_label or "Transcripción Local STT",
                payload.transcript,
                payload.llm_model or "default",
            ),
        )
        await db.commit()

    # Encolar procesamiento LLM en segundo plano
    background_tasks.add_task(process_levantamiento_session, session_id)

    return await get_session_by_id(session_id)


@router.get("/projects/{project_id}", response_model=List[LevantamientoSessionResponse])
async def list_project_sessions(project_id: str):
    sessions = []
    async with get_db() as db:
        async with db.execute(
            "SELECT * FROM levantamiento_sessions WHERE project_id = ? ORDER BY created_at DESC", (project_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                session_dict = dict(row)
                session_dict["proposals"] = await _fetch_proposals(db, row["id"])
                sessions.append(session_dict)
    return sessions


@router.get("/{session_id}", response_model=LevantamientoSessionResponse)
async def get_session_by_id(session_id: str):
    async with get_db() as db:
        async with db.execute("SELECT * FROM levantamiento_sessions WHERE id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Sesión de levantamiento no encontrada")
            
            session_dict = dict(row)
            session_dict["proposals"] = await _fetch_proposals(db, session_id)
            return session_dict


@router.patch("/{session_id}/proposals/{proposal_id}", response_model=StoryProposalResponse)
async def update_proposal(session_id: str, proposal_id: str, payload: StoryProposalUpdate):
    async with get_db() as db:
        async with db.execute("SELECT * FROM levantamiento_story_proposals WHERE id = ? AND session_id = ?", (proposal_id, session_id)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Propuesta no encontrada")

        updates = []
        values = []
        if payload.title is not None:
            updates.append("title = ?")
            values.append(payload.title)
        if payload.description is not None:
            updates.append("description = ?")
            values.append(payload.description)
        if payload.acceptance_criteria is not None:
            updates.append("acceptance_criteria = ?")
            values.append(payload.acceptance_criteria)
        if payload.priority is not None:
            updates.append("priority = ?")
            values.append(payload.priority)
        if payload.status is not None:
            updates.append("status = ?")
            values.append(payload.status)

        if updates:
            values.append(proposal_id)
            await db.execute(f"UPDATE levantamiento_story_proposals SET {', '.join(updates)} WHERE id = ?", values)
            await db.commit()

        async with db.execute("SELECT * FROM levantamiento_story_proposals WHERE id = ?", (proposal_id,)) as cursor:
            updated_row = await cursor.fetchone()
            return dict(updated_row)


@router.post("/{session_id}/import")
async def import_proposals_to_iteration(session_id: str, payload: ImportProposalsRequest):
    async with get_db() as db:
        # Verificar que la sesión existe
        async with db.execute("SELECT id FROM levantamiento_sessions WHERE id = ?", (session_id,)) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Sesión de levantamiento no encontrada")

        imported_count = 0
        for prop_id in payload.proposal_ids:
            async with db.execute("SELECT * FROM levantamiento_story_proposals WHERE id = ? AND session_id = ?", (prop_id, session_id)) as cursor:
                prop = await cursor.fetchone()
                if prop and prop["status"] != "Importada":
                    story_id = f"US-{uuid.uuid4().hex[:6].upper()}"
                    # Marcar la propuesta como importada y vincular el ID
                    await db.execute(
                        "UPDATE levantamiento_story_proposals SET status = 'Importada', imported_story_id = ? WHERE id = ?",
                        (story_id, prop_id)
                    )
                    imported_count += 1

        await db.commit()

    return {
        "ok": True,
        "message": f"Se importaron {imported_count} propuestas como Historias de Usuario a la iteración {payload.iteration_id}",
        "imported_count": imported_count,
        "iteration_id": payload.iteration_id
    }


async def _fetch_proposals(db, session_id: str) -> List[dict]:
    async with db.execute(
        "SELECT * FROM levantamiento_story_proposals WHERE session_id = ? ORDER BY created_at ASC", (session_id,)
    ) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
