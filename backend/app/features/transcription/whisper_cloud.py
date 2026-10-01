from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from app.ai.providers.factory import get_ai_settings

logger = logging.getLogger(__name__)


class WhisperCloudService:
  def __init__(self, provider: str = "groq", api_key: Optional[str] = None):
    self.provider = provider.lower()
    self.api_key = api_key

  def _resolve_credentials(self) -> tuple[str, str, str]:
    config = get_ai_settings()
    prov = self.provider

    if prov in {"groq", "auto"}:
      key = self.api_key or config.get("groq_api_key") or os.getenv("GROQ_API_KEY", "")
      if key:
        return "groq", key, "whisper-large-v3"

    if prov in {"openai", "auto"}:
      key = self.api_key or config.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
      if key:
        return "openai", key, "whisper-1"

    # Fallback checking any available key
    groq_key = config.get("groq_api_key") or os.getenv("GROQ_API_KEY", "")
    if groq_key:
      return "groq", groq_key, "whisper-large-v3"

    openai_key = config.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
    if openai_key:
      return "openai", openai_key, "whisper-1"

    raise ValueError(
      "No se encontró una clave de API válida para transcripción en la nube. "
      "Configura tu Groq API Key o OpenAI API Key en Ajustes."
    )

  async def transcribe(
    self,
    audio_path: Path,
    language: Optional[str] = None,
    response_format: str = "verbose_json",
  ) -> Dict[str, Any]:
    provider, key, model = self._resolve_credentials()

    if not audio_path.exists():
      raise FileNotFoundError(f"El archivo de audio '{audio_path}' no existe.")

    # Select endpoint
    if provider == "groq":
      url = "https://api.groq.com/openai/v1/audio/transcriptions"
    else:
      url = "https://api.openai.com/v1/audio/transcriptions"

    headers = {
      "Authorization": f"Bearer {key}",
    }

    data: Dict[str, Any] = {
      "model": model,
      "response_format": response_format,
    }
    if language:
      data["language"] = language

    filename = audio_path.name
    content_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"

    async with httpx.AsyncClient(timeout=300.0) as client:
      with open(audio_path, "rb") as f:
        files = {
          "file": (filename, f, content_type),
        }
        response = await client.post(url, headers=headers, data=data, files=files)

      if response.status_code != 200:
        err_detail = response.text
        try:
          err_json = response.json()
          err_detail = err_json.get("error", {}).get("message", err_detail)
        except Exception:
          pass
        raise RuntimeError(f"Error del servicio de transcripción {provider} ({response.status_code}): {err_detail}")

      res_data = response.json()

    # Parse response
    detected_lang = res_data.get("language", language or "es")
    full_text = res_data.get("text", "").strip()
    raw_segments = res_data.get("segments", [])
    duration = float(res_data.get("duration", 0.0))

    formatted_segments: List[Dict[str, Any]] = []

    if raw_segments:
      for idx, seg in enumerate(raw_segments):
        formatted_segments.append({
          "start": float(seg.get("start", 0.0)),
          "end": float(seg.get("end", 0.0)),
          "text": seg.get("text", "").strip(),
          "speaker": f"Participante {(idx % 2) + 1}",
        })
    else:
      # If verbose_json was not returned or had no segments, create a single segment
      formatted_segments.append({
        "start": 0.0,
        "end": duration,
        "text": full_text,
        "speaker": "Participante 1",
      })

    return {
      "language": detected_lang,
      "text": full_text,
      "segments": formatted_segments,
      "duration": duration,
      "provider": provider,
      "model": model,
    }

  def estimate_cost(self, duration_seconds: float) -> float:
    # OpenAI Whisper: ~$0.006 per minute. Groq Whisper: ~$0.0018 per minute.
    minutes = duration_seconds / 60.0
    if self.provider == "groq":
      return minutes * 0.0018
    return minutes * 0.006
