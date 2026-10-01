from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from app.context.knowledge import ingest_document
from app.features.transcription.diarization import SpeakerDiarization
from app.features.transcription.storage import (
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
        progress=100,
        message="Transcripción completada con éxito.",
      )
    return None

  async def transcribe_media_async(
    self,
    media_id: str,
    transcription_id: str,
    mode: str = "auto",
    language: Optional[str] = None,
    model_size: Optional[str] = None,
    enable_diarization: bool = True,
  ) -> TranscriptionResult:
    media_entry = get_media_entry(media_id)
    if not media_entry:
      _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
        id=transcription_id,
        media_id=media_id,
        status="failed",
        progress=0,
        message="Archivo multimedia no encontrado.",
        error="Media file not found in storage.",
      )
      raise FileNotFoundError(f"Media entry {media_id} not found.")

    media_path = get_media_path(media_id)
    if not media_path or not media_path.exists():
      _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
        id=transcription_id,
        media_id=media_id,
        status="failed",
        progress=0,
        message="El archivo en disco no existe.",
        error="Media file missing on disk.",
      )
      raise FileNotFoundError(f"Media file on disk for {media_id} not found.")

    # 1. Start Preprocessing
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="preprocessing",
      progress=15,
      message="Extrayendo y normalizando pista de audio...",
    )

    audio_track_path = media_path
    if media_entry.get("is_video"):
      wav_candidate = media_path.with_suffix(".wav")
      audio_track_path = extract_audio_track(media_path, wav_candidate)

    # 2. Transcribing
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="transcribing",
      progress=35,
      message="Procesando reconocimiento de voz con Whisper...",
    )

    transcription_output: Dict[str, Any] = {}
    used_mode = mode.lower()

    if used_mode == "local" or (used_mode == "auto" and self.local_service.is_available()):
      try:
        if model_size and model_size != self.local_service.model_size:
          self.local_service = WhisperLocalService(model_size=model_size)
        transcription_output = self.local_service.transcribe(audio_track_path, language=language)
      except Exception as exc:
        logger.warning(f"Local Whisper failed: {exc}. Trying cloud service...")
        if used_mode == "local":
          _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
            id=transcription_id,
            media_id=media_id,
            status="failed",
            progress=35,
            message="Error en transcripción local.",
            error=str(exc),
          )
          raise exc
        transcription_output = await self.cloud_service.transcribe(audio_track_path, language=language)
    else:
      # Cloud mode (Groq or OpenAI)
      transcription_output = await self.cloud_service.transcribe(audio_track_path, language=language)

    # 3. Speaker Diarization
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="diarizing",
      progress=65,
      message="Identificando interlocutores y segmentando turnos de habla...",
    )

    raw_segments = transcription_output.get("segments", [])
    if enable_diarization and raw_segments:
      labeled_segments = self.diarizer.diarize_segments(raw_segments, audio_track_path)
    else:
      labeled_segments = raw_segments

    # 4. Summarization
    _ACTIVE_JOBS[transcription_id] = TranscriptionProgress(
      id=transcription_id,
      media_id=media_id,
      status="summarizing",
      progress=85,
      message="Extrayendo resumen ejecutivo, participantes y requerimientos clave con IA...",
    )

    meeting_title = media_entry.get("title") or "Reunión de Requerimientos"
    summary = await summarize_transcript(labeled_segments, title=meeting_title)

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
      progress=100,
      message="Transcripción y análisis completados con éxito.",
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
