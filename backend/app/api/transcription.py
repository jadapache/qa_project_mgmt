from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel

from app.features.inventario.xlsx_builder import create_inventario_xlsx
from app.features.levantamiento.docx_builder import create_levantamiento_docx
from app.features.transcription.service import transcription_service
from app.features.transcription.storage import (
  delete_transcription_record,
  get_media_entry,
  get_transcription_record,
  list_transcriptions,
  rename_transcription_speakers,
  save_media_file,
  update_transcription_summary,
)
from app.schemas.transcription import (
  RenameSpeakerRequest,
  SaveToKnowledgeRequest,
  TranscribeRequest,
  TranscriptionProgress,
  TranscriptionResult,
  UpdateSummaryRequest,
)

router = APIRouter(prefix="/transcription", tags=["transcription"])


class ExportDocumentRequest(BaseModel):
  content: str = ""
  title: str = "Documento"


@router.post("/upload")
async def upload_media(
  file: UploadFile = File(...),
  title: str = Form(...),
  description: str = Form(default=""),
) -> dict[str, Any]:
  """Upload media file (audio or video) for transcription."""
  content = await file.read()
  if not content:
    raise HTTPException(status_code=400, detail="El archivo subido está vacío.")

  try:
    entry = save_media_file(
      file_bytes=content,
      filename=file.filename or "audio_file",
      title=title,
      description=description,
    )
    return {
      "ok": True,
      "media_id": entry["id"],
      "entry": entry,
      "message": "Archivo multimedia cargado con éxito.",
    }
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Error procesando archivo: {exc}") from exc


@router.post("/transcribe/{media_id}")
async def start_transcription(
  media_id: str,
  background_tasks: BackgroundTasks,
  req: Optional[TranscribeRequest] = None,
) -> dict[str, Any]:
  """Trigger background transcription process for uploaded media."""
  entry = get_media_entry(media_id)
  if not entry:
    raise HTTPException(status_code=404, detail="Archivo multimedia no encontrado.")

  transcription_id = str(uuid.uuid4())
  transcribe_cfg = req or TranscribeRequest()

  async def _run_job():
    try:
      await transcription_service.transcribe_media_async(
        media_id=media_id,
        transcription_id=transcription_id,
        mode=transcribe_cfg.mode,
        language=transcribe_cfg.language,
        model_size=transcribe_cfg.model_size,
        enable_diarization=transcribe_cfg.enable_diarization,
      )
    except Exception as exc:
      # Exception is recorded inside active job status in transcription_service
      pass

  background_tasks.add_task(_run_job)

  return {
    "ok": True,
    "status": "started",
    "transcription_id": transcription_id,
    "media_id": media_id,
  }


@router.get("/status/{transcription_id}")
async def get_transcription_status(transcription_id: str) -> TranscriptionProgress:
  """Poll transcription status and progress."""
  prog = transcription_service.get_job_progress(transcription_id)
  if not prog:
    record = get_transcription_record(transcription_id)
    if record:
      return TranscriptionProgress(
        id=transcription_id,
        media_id=record.get("media_id", ""),
        status="complete",
        progress=100,
        message="Transcripción completa.",
      )
    raise HTTPException(status_code=404, detail="Trabajo de transcripción no encontrado.")
  return prog


@router.get("/result/{transcription_id}")
async def get_transcription_result(transcription_id: str) -> TranscriptionResult:
  """Retrieve completed transcript and summary."""
  record = get_transcription_record(transcription_id)
  if not record:
    raise HTTPException(status_code=404, detail="Resultado de transcripción no encontrado.")
  return TranscriptionResult(**record)


@router.put("/summary/{transcription_id}")
async def update_summary(
  transcription_id: str,
  body: UpdateSummaryRequest,
) -> dict[str, Any]:
  """Update/edit the meeting summary."""
  updated = update_transcription_summary(transcription_id, body.summary.model_dump())
  if not updated:
    raise HTTPException(status_code=404, detail="Transcripción no encontrada.")
  return {"ok": True, "transcription": updated}


@router.put("/speakers/{transcription_id}")
async def rename_speakers(
  transcription_id: str,
  body: RenameSpeakerRequest,
) -> dict[str, Any]:
  """Rename speaker labels across transcript segments and summary."""
  updated = rename_transcription_speakers(transcription_id, body.speaker_map)
  if not updated:
    raise HTTPException(status_code=404, detail="Transcripción no encontrada.")
  return {"ok": True, "transcription": updated}


@router.post("/save-to-knowledge/{transcription_id}")
async def save_to_knowledge_base(
  transcription_id: str,
  body: Optional[SaveToKnowledgeRequest] = None,
) -> dict[str, Any]:
  """Save transcript and summary into the Knowledge Base for RAG retrieval."""
  try:
    tags = body.custom_tags if body else []
    return transcription_service.save_to_knowledge_base(transcription_id, custom_tags=tags)
  except ValueError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Error guardando en biblioteca: {exc}") from exc


@router.get("/list")
async def list_all_transcriptions() -> dict[str, Any]:
  """List all saved transcriptions."""
  items = list_transcriptions()
  return {"transcriptions": items}


@router.delete("/{transcription_id}")
async def delete_transcription(transcription_id: str) -> dict[str, Any]:
  """Delete a transcription and its associated media file."""
  success = delete_transcription_record(transcription_id)
  if not success:
    raise HTTPException(status_code=404, detail="Transcripción no encontrada o no pudo eliminarse.")
  return {"ok": True, "message": "Transcripción eliminada con éxito."}


@router.post("/export/inventario")
async def export_inventario(req: ExportDocumentRequest) -> Response:
  """Export Inventario document as formatted .xlsx binary."""
  try:
    xlsx_bytes = create_inventario_xlsx(markdown_content=req.content, title=req.title)
    safe_title = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.title) or "Inventario_Requerimientos"
    filename = f"Inventario_{safe_title}.xlsx"
    return Response(
      content=xlsx_bytes,
      media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Error al generar XLSX de Inventario: {exc}") from exc


@router.post("/export/levantamiento")
async def export_levantamiento(req: ExportDocumentRequest) -> Response:
  """Export Levantamiento document as formatted .docx binary."""
  try:
    docx_bytes = create_levantamiento_docx(req.content, title=req.title)
    safe_title = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.title) or "Levantamiento_Requerimientos"
    filename = f"Levantamiento_{safe_title}.docx"
    return Response(
      content=docx_bytes,
      media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=f"Error al generar DOCX de Levantamiento: {exc}") from exc
