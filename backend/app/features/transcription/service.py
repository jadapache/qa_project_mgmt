from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Set

from app.context.knowledge import ingest_document
from app.core.storage import load_app_settings
from app.features.transcription.diarization import SpeakerDiarization
from app.features.transcription.storage import (
  delete_transcription_record,
  get_media_entry,
  get_media_path,
  get_transcription_record,
  save_transcription_record,
)
from app.features.transcription.summarizer import summarize_transcript
from app.features.transcription.whisper_cloud import WhisperCloudService
from app.features.transcription.whisper_local import WhisperLocalService, extract_audio_track
from app.schemas.transcription import (
  MediaMetadata,
  TranscriptionProgress,
  TranscriptionResult,
  TranscriptionSegment,
  TranscriptionSummary,
)

logger = logging.getLogger(__name__)

# In-memory progress tracking for active jobs
_ACTIVE_JOBS: Dict[str, TranscriptionProgress] = {}
_CANCELLED_JOBS: Set[str] = set()


def _format_eta(seconds: float) -> str:
  if seconds <= 0:
    return "unos segundos"
  mins = int(seconds // 60)
  secs = int(seconds % 60)
  if mins > 0:
    return f"~{mins} min {secs} s"
  return f"~{secs} s"


class TranscriptionService:
  def __init__(self):
    self.local_service = WhisperLocalService()
    self.cloud_service = WhisperCloudService()
    self.diarizer = SpeakerDiarization()

  def get_job_progress(self, transcription_id: str) -> Optional[TranscriptionProgress]:
    if transcription_id in _ACTIVE_JOBS:
      return _ACTIVE_JOBS[transcription_id]

    # Check if already completed and stored on disk
    record = get_transcription_record(transcription_id)
    if record:
      return TranscriptionProgress(
        id=transcription_id,
        media_id=record.get("media_id", ""),
        status="complete",
        stage="complete",
        progress=100,
        message="Transcripción completada con éxito.",
        eta="0 s",
        model_info=record.get("model_info", "Whisper"),
      )
    return None

  def cancel_transcription(self, transcription_id: str) -> bool:
    """Cancels an active or pending transcription job and cleans up files."""
    _CANCELLED_JOBS.add(transcription_id)
    if transcription_id in _ACTIVE_JOBS:
      job = _ACTIVE_JOBS[transcription_id]
      job.status = "cancelled"
      job.stage = "cancelled"
      job.message = "Transcripción cancelada por el usuario."
      job.progress = 0
      job.eta = None

      # Clean up uploaded media file immediately
      if job.media_id:
        media_path = get_media_path(job.media_id)
        if media_path and media_path.exists():
          try:
            media_path.unlink()
          except OSError:
            pass

    # Clean up JSON record if partial
    delete_transcription_record(transcription_id)
    return True

  def get_available_models_info(self) -> dict[str, Any]:
    """Inspects system settings and returns available and active transcription models."""
    ai_cfg = load_app_settings().get("ai", {})
    provider = (ai_cfg.get("transcription_provider") or "auto").lower()
    model = ai_cfg.get("transcription_model") or "whisper-large-v3"
    groq_key = bool(ai_cfg.get("groq_api_key") or os.getenv("GROQ_API_KEY"))
    openai_key = bool(ai_cfg.get("openai_api_key") or os.getenv("OPENAI_API_KEY"))
    local_avail = self.local_service.is_available()

    available = []
    if local_avail:
      available.append("local")
    if groq_key:
      available.append("groq")
    if openai_key:
      available.append("openai")

    active_label = "Whisper Auto"
    if provider == "local" or (provider == "auto" and local_avail and not groq_key and not openai_key):
      active_label = f"Whisper Local ({model or 'base'})"
    elif groq_key and (provider in ("groq", "auto", "cloud")):
      active_label = f"Groq Whisper ({model or 'whisper-large-v3'})"
    elif openai_key and (provider in ("openai", "auto", "cloud")):
      active_label = f"OpenAI Whisper ({model or 'whisper-1'})"

    return {
      "configured_provider": provider,
      "configured_model": model,
      "local_available": local_avail,
      "groq_configured": groq_key,
      "openai_configured": openai_key,
      "available_providers": available,
      "active_model_label": active_label,
    }

  async def transcribe_media_async(
    self,
    media_id: str,
    transcription_id: str,
    mode: str = "auto",
    language: Optional[str] = None,
    model_size: Optional[str] = None,
    enable_diarization: bool = True,
  ) -> TranscriptionResult:
    # Clear any previous cancel flag
    if transcription_id in _CANCELLED_JOBS:
      _CANCELLED_JOBS.remove(transcription_id)

    # Determine active model info label from settings
    model_info_data = self.get_available_models_info()
    active_model_label = model_info_data.get("active_model_label", "Whisper")

    media_entry = get_media_entry(media_id)
    if not media_entry:
      _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
        id=transcription_id,
        media_id=media_id,
        status="failed",
        stage="failed",
        progress=0,
        message="Archivo multimedia no encontrado.",
        error="Media file not found in storage.",
        model_info=active_model_label,
      )
      raise FileNotFoundError(f"Media entry {media_id} not found.")

    media_path = get_media_path(media_id)
    if not media_path or not media_path.exists():
      _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
        id=transcription_id,
        media_id=media_id,
        status="failed",
        stage="failed",
        progress=0,
        message="El archivo en disco no existe.",
        error="Media file missing on disk.",
        model_info=active_model_label,
      )
      raise FileNotFoundError(f"Media file on disk for {media_id} not found.")

    start_time = time.time()

    def _check_cancelled():
      if transcription_id in _CANCELLED_JOBS:
        raise asyncio.CancelledError(f"Job {transcription_id} was cancelled by user.")

    # 1. Start Preprocessing
    _check_cancelled()
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="preprocessing",
      stage="preprocessing",
      progress=15,
      message="Extrayendo y normalizando pista de audio...",
      eta=_format_eta(45),
      model_info=active_model_label,
    )

    audio_track_path = media_path
    if media_entry.get("is_video"):
      wav_candidate = media_path.with_suffix(".wav")
      audio_track_path = extract_audio_track(media_path, wav_candidate)

    _check_cancelled()

    # 2. Transcribing with smooth progress ticker
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="transcribing",
      stage="transcribing",
      progress=25,
      message=f"Decodificando audio con {active_model_label}...",
      eta=_format_eta(35),
      model_info=active_model_label,
    )

    # Background progress ticker while transcribe executes
    ticker_running = True

    async def _progress_ticker():
      curr_prog = 25
      while ticker_running and curr_prog < 70:
        await asyncio.sleep(1.2)
        if not ticker_running or transcription_id in _CANCELLED_JOBS:
          break
        curr_prog += 5
        elapsed = time.time() - start_time
        remaining = max(5, (100 - curr_prog) * (elapsed / max(curr_prog, 1)))
        if transcription_id in _ACTIVE_JOBS and _ACTIVE_JOBS[transcription_id].status == "transcribing":
          _ACTIVE_JOBS[transcription_id].progress = curr_prog
          _ACTIVE_JOBS[transcription_id].eta = _format_eta(remaining)
          _ACTIVE_JOBS[transcription_id].message = f"Transcribiendo audio ({curr_prog}%)..."

    ticker_task = asyncio.create_task(_progress_ticker())

    transcription_output: Dict[str, Any] = {}
    used_mode = mode.lower()

    # Read config settings if mode is auto
    ai_cfg = load_app_settings().get("ai", {})
    cfg_provider = (ai_cfg.get("transcription_provider") or "").lower()

    try:
      if used_mode == "local" or (used_mode == "auto" and cfg_provider == "local") or (used_mode == "auto" and self.local_service.is_available() and not model_info_data.get("groq_configured") and not model_info_data.get("openai_configured")):
        if model_size and model_size != self.local_service.model_size:
          self.local_service = WhisperLocalService(model_size=model_size)
        transcription_output = self.local_service.transcribe(audio_track_path, language=language)
      else:
        # Cloud mode (Groq or OpenAI)
        transcription_output = await self.cloud_service.transcribe(audio_track_path, language=language)
    finally:
      ticker_running = False
      ticker_task.cancel()

    _check_cancelled()

    # 3. Speaker Diarization
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="diarizing",
      stage="diarizing",
      progress=75,
      message="Identificando interlocutores y segmentando turnos de habla...",
      eta=_format_eta(15),
      model_info=active_model_label,
    )

    raw_segments = transcription_output.get("segments", [])
    if enable_diarization and raw_segments:
      labeled_segments = self.diarizer.diarize_segments(raw_segments, audio_track_path)
    else:
      labeled_segments = raw_segments

    _check_cancelled()

    # 4. Summarization
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="summarizing",
      stage="summarizing",
      progress=88,
      message="Extrayendo resumen ejecutivo, participantes y requerimientos con IA...",
      eta=_format_eta(5),
      model_info=active_model_label,
    )

    meeting_title = media_entry.get("title") or "Reunión de Requerimientos"
    summary = await summarize_transcript(labeled_segments, title=meeting_title)

    _check_cancelled()

    # 5. Finalize and Save
    now = datetime.now(timezone.utc).isoformat()
    typed_segments = [
      TranscriptionSegment(
        start=float(s.get("start", 0.0)),
        end=float(s.get("end", 0.0)),
        speaker=s.get("speaker", "Participante 1"),
        text=s.get("text", "").strip(),
      )
      for s in labeled_segments
    ]

    result = TranscriptionResult(
      id=transcription_id,
      media_id=media_id,
      metadata=MediaMetadata(
        title=media_entry.get("title", "Reunión"),
        description=media_entry.get("description", ""),
      ),
      language=transcription_output.get("language", language or "es"),
      duration_seconds=float(transcription_output.get("duration", 0.0)),
      created_at=now,
      segments=typed_segments,
      text=transcription_output.get("text", ""),
      summary=summary,
      saved_to_knowledge=False,
    )

    save_transcription_record(result.model_dump())

    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="complete",
      stage="complete",
      progress=100,
      message="Transcripción y análisis completados con éxito.",
      eta="0 s",
      model_info=active_model_label,
    )

    return result

  def save_to_knowledge_base(
    self,
    transcription_id: str,
    custom_tags: list[str] | None = None,
  ) -> dict[str, Any]:
    record = get_transcription_record(transcription_id)
    if not record:
      raise ValueError(f"Transcription {transcription_id} not found.")

    metadata = record.get("metadata", {})
    title = metadata.get("title", "Reunion")
    summary = record.get("summary") or {}
    segments = record.get("segments", [])

    # Format structured searchable content
    lines = [
      f"# Minuta y Transcripción: {title}",
      f"- Fecha: {record.get('created_at', '')}",
      f"- Idioma: {record.get('language', 'es')}",
      "",
      "## Resumen Ejecutivo de la Reunión",
      f"**Participantes:** {', '.join(summary.get('participants', []))}",
      "",
      "**Temas Tratados:**",
    ]
    for topic in summary.get("topics", []):
      lines.append(f"- {topic}")

    lines.append("\n**Decisiones Acordadas:**")
    for d in summary.get("decisions", []):
      lines.append(f"- {d}")

    lines.append("\n**Requerimientos Identificados:**")
    for req in summary.get("requirements", []):
      lines.append(f"- {req}")

    if summary.get("action_items"):
      lines.append("\n**Compromisos y Próximos Pasos:**")
      for act in summary.get("action_items", []):
        lines.append(f"- {act}")

    lines.append("\n---\n## Transcripción Completa")
    for seg in segments:
      mins = int(seg.get("start", 0) // 60)
      secs = int(seg.get("start", 0) % 60)
      lines.append(f"[{mins:02d}:{secs:02d}] {seg.get('speaker', 'Participante')}: {seg.get('text', '')}")

    document_text = "\n".join(lines)
    tags = ["transcript", "meeting", "funcional", "levantamiento", "inventario"]
    if custom_tags:
      tags.extend(custom_tags)

    safe_title = "".join(c if c.isalnum() else "_" for c in title).strip("_")
    filename = f"Transcripcion_{safe_title}.txt"

    entry = ingest_document(
      filename=filename,
      raw=document_text.encode("utf-8"),
      tags=list(dict.fromkeys(tags)),
    )

    record["saved_to_knowledge"] = True
    record["document_id"] = entry["id"]
    save_transcription_record(record)

    return {
      "ok": True,
      "document_id": entry["id"],
      "filename": filename,
      "message": "Transcripción guardada exitosamente en la Biblioteca de Conocimiento.",
    }


transcription_service = TranscriptionService()

