"""Dynamic AI model catalog service.

Consults external media (models.dev API with OpenRouter fallback)
to provide up-to-date models per provider with free/paid indicators,
usage limits (RPM/RPD/TPM), and token pricing.
Includes local file caching for resilience and offline support.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.core.settings import CACHE_DIR

logger = logging.getLogger(__name__)

CACHE_FILE = CACHE_DIR / "ai_models_catalog_cache.json"
CACHE_TTL_SECONDS = 6 * 3600  # 6 hours


class AIModelInfo(BaseModel):
  id: str
  raw_id: str
  name: str
  provider: str  # "groq" | "openai" | "claude" | "gemini" | "ollama"
  provider_name: str
  description: str
  context_window: str
  context_length: int
  task_type: str = "chat_writing"  # "chat_writing" | "transcription"
  task_label: str = "Redacción y Chat"  # "Redacción y Chat" | "Transcripción y Voz"
  tier_type: str  # "free" | "paid" | "freemium"
  pricing_prompt: float = 0.0  # USD per 1M tokens
  pricing_completion: float = 0.0  # USD per 1M tokens
  pricing_label: str
  rate_limits: str
  badge: str | None = None
  is_free: bool = False


class ModelCatalogResponse(BaseModel):
  updated_at: str
  source: str
  providers: list[str]
  models: list[AIModelInfo]
  error: str | None = None


def _format_context(length: int) -> str:
  if not length or length <= 0:
    return "128k tokens"
  if length >= 1_000_000:
    return f"{length // 1_000_000}M tokens" if length % 1_000_000 == 0 else f"{length / 1_000_000:.1f}M tokens"
  if length >= 1_000:
    return f"{length // 1_000}k tokens"
  return f"{length} tokens"


def _enrich_groq_model(raw_id: str, name: str, desc: str, context_len: int) -> AIModelInfo:
  clean_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id
  is_whisper = "whisper" in clean_id.lower()
  is_70b = "70b" in clean_id.lower() or "deepseek" in clean_id.lower()
  is_8b = "8b" in clean_id.lower() or "instant" in clean_id.lower()

  if is_whisper:
    task_type = "transcription"
    task_label = "Transcripción y Voz"
    limits = "30 RPM • 14,400 RPD"
    badge = "Voz / Transcripción (Próximamente)"
    ctx_label = "Audio (hasta 25MB)"
    description = desc or "Transcripción multilingüe de voz a texto a velocidad ultrarrápida en Groq LPU."
  elif is_70b:
    task_type = "chat_writing"
    task_label = "Redacción y Chat"
    limits = "30 RPM • 1,000 RPD • 6k TPM"
    badge = "Razonamiento Potente (Free Tier)"
    ctx_label = _format_context(context_len)
    description = desc or "Inferencia acelerada en la nube con hardware LPU de Groq."
  elif is_8b:
    task_type = "chat_writing"
    task_label = "Redacción y Chat"
    limits = "30 RPM • 14,400 RPD • 20k TPM"
    badge = "Ultra Rápido (Free Tier)"
    ctx_label = _format_context(context_len)
    description = desc or "Inferencia acelerada en la nube con hardware LPU de Groq."
  else:
    task_type = "chat_writing"
    task_label = "Redacción y Chat"
    limits = "30 RPM • 14,400 RPD"
    badge = "Gratis en Groq Cloud"
    ctx_label = _format_context(context_len)
    description = desc or "Inferencia acelerada en la nube con hardware LPU de Groq."

  return AIModelInfo(
    id=clean_id,
    raw_id=raw_id,
    name=name or clean_id,
    provider="groq",
    provider_name="Groq Cloud",
    description=description,
    context_window=ctx_label,
    context_length=context_len if not is_whisper else 0,
    task_type=task_type,
    task_label=task_label,
    tier_type="free",
    pricing_prompt=0.0,
    pricing_completion=0.0,
    pricing_label="$0.00 (Gratuito en Groq Cloud)",
    rate_limits=limits,
    badge=badge,
    is_free=True,
  )


def _enrich_gemini_model(raw_id: str, name: str, desc: str, cost: dict[str, Any] | None, context_len: int) -> AIModelInfo:
  clean_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id
  p_in = float((cost or {}).get("input") or 0.075)
  p_out = float((cost or {}).get("output") or 0.30)

  is_pro = "pro" in clean_id.lower()
  if is_pro:
    limits = "Free Tier: 2 RPM • 50 RPD • 32k TPM"
    badge = "Razonamiento Avanzado Gemini"
  else:
    limits = "Free Tier: 15 RPM • 1,500 RPD • 1M TPM"
    badge = "Recomendado Google / Multimodal"

  return AIModelInfo(
    id=clean_id,
    raw_id=raw_id,
    name=name or clean_id,
    provider="gemini",
    provider_name="Google Gemini",
    description=desc or "Modelo fundacional de Google con ventana masiva de contexto y comprensión multimodal.",
    context_window=_format_context(context_len or 1048576),
    context_length=context_len or 1048576,
    task_type="chat_writing",
    task_label="Redacción y Chat",
    tier_type="freemium",
    pricing_prompt=round(p_in, 4),
    pricing_completion=round(p_out, 4),
    pricing_label=f"Gratis en AI Studio | Pago: ${p_in:.3f} / ${p_out:.3f} por 1M tokens",
    rate_limits=limits,
    badge=badge,
    is_free=True,
  )


def _enrich_openai_model(raw_id: str, name: str, desc: str, cost: dict[str, Any] | None, context_len: int) -> AIModelInfo:
  clean_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id
  is_whisper = "whisper" in clean_id.lower()

  if is_whisper:
    return AIModelInfo(
      id=clean_id,
      raw_id=raw_id,
      name=name or "Whisper Audio",
      provider="openai",
      provider_name="OpenAI API",
      description=desc or "Modelo estándar de transcripción de audio multilingüe y traducción al inglés de OpenAI.",
      context_window="Audio (hasta 25MB)",
      context_length=0,
      task_type="transcription",
      task_label="Transcripción y Voz",
      tier_type="paid",
      pricing_prompt=0.0,
      pricing_completion=0.0,
      pricing_label="$0.006 / minuto de audio",
      rate_limits="Tier 1: 500 RPM • 50 RPD",
      badge="Voz / Audio (Próximamente)",
      is_free=False,
    )

  p_in = float((cost or {}).get("input") or 0.15)
  p_out = float((cost or {}).get("output") or 0.60)

  badge = None
  if "mini" in clean_id.lower():
    badge = "Económico y Veloz"
  elif "o3" in clean_id.lower() or "o1" in clean_id.lower():
    badge = "Razonamiento Paso a Paso"
  elif "4o" in clean_id.lower():
    badge = "Frontera Completa"

  return AIModelInfo(
    id=clean_id,
    raw_id=raw_id,
    name=name or clean_id,
    provider="openai",
    provider_name="OpenAI API",
    description=desc or "Modelo de alta inteligencia y versatilidad de OpenAI para tareas de ingeniería y QA.",
    context_window=_format_context(context_len or 128000),
    context_length=context_len or 128000,
    task_type="chat_writing",
    task_label="Redacción y Chat",
    tier_type="paid",
    pricing_prompt=round(p_in, 4),
    pricing_completion=round(p_out, 4),
    pricing_label=f"${p_in:.2f} entrada / ${p_out:.2f} salida por 1M tokens",
    rate_limits="Tier 1: 500 RPM • 200k TPM",
    badge=badge,
    is_free=False,
  )


def _enrich_claude_model(raw_id: str, name: str, desc: str, cost: dict[str, Any] | None, context_len: int) -> AIModelInfo:
  clean_id = raw_id.split("/")[-1] if "/" in raw_id else raw_id
  p_in = float((cost or {}).get("input") or 0.80)
  p_out = float((cost or {}).get("output") or 4.00)

  badge = None
  if "haiku" in clean_id.lower():
    badge = "Respuesta Rápida"
  elif "sonnet" in clean_id.lower():
    badge = "Líder en Código y Razonamiento"
  elif "opus" in clean_id.lower():
    badge = "Máxima Capacidad Cognitiva"

  return AIModelInfo(
    id=clean_id,
    raw_id=raw_id,
    name=name or clean_id,
    provider="claude",
    provider_name="Anthropic Claude",
    description=desc or "Modelo de Anthropic líder en comprensión de código, seguridad y seguimiento de instrucciones.",
    context_window=_format_context(context_len or 200000),
    context_length=context_len or 200000,
    task_type="chat_writing",
    task_label="Redacción y Chat",
    tier_type="paid",
    pricing_prompt=round(p_in, 4),
    pricing_completion=round(p_out, 4),
    pricing_label=f"${p_in:.2f} entrada / ${p_out:.2f} salida por 1M tokens",
    rate_limits="Build Tier: 50 RPM • 40k TPM",
    badge=badge,
    is_free=False,
  )


def _load_cache() -> tuple[list[AIModelInfo] | None, float]:
  try:
    if CACHE_FILE.exists():
      raw = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
      timestamp = raw.get("timestamp", 0)
      models_data = raw.get("models", [])
      models = [AIModelInfo(**m) for m in models_data]
      return models, timestamp
  except Exception as e:
    logger.warning(f"Error reading AI models catalog cache: {e}")
  return None, 0


def _save_cache(models: list[AIModelInfo]) -> None:
  try:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
      "timestamp": time.time(),
      "models": [m.model_dump() for m in models],
    }
    CACHE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
  except Exception as e:
    logger.warning(f"Error saving AI models catalog cache: {e}")


async def _fetch_from_models_dev() -> list[AIModelInfo]:
  """Primary external source: https://models.dev/api.json."""
  url = "https://models.dev/api.json"
  async with httpx.AsyncClient(timeout=12.0) as client:
    res = await client.get(url, headers={"User-Agent": "QA-MGMT/0.2.0"})
    res.raise_for_status()
    data = res.json()

  collected: list[AIModelInfo] = []

  # 1. Groq models (including Whisper)
  groq_section = data.get("groq", {}).get("models", {})
  for mid, item in groq_section.items():
    if "prompt-guard" in mid.lower() or "orpheus" in mid.lower():
      continue
    ctx = (item.get("limit") or {}).get("context") or 131072
    collected.append(
      _enrich_groq_model(
        raw_id=mid,
        name=item.get("name") or mid,
        desc=item.get("description") or "",
        context_len=ctx,
      )
    )

  # 2. Google Gemini models
  google_section = data.get("google", {}).get("models", {})
  for mid, item in google_section.items():
    name = item.get("name") or mid
    desc = item.get("description") or ""
    combined = f"{mid} {name} {desc}".lower()
    if "gemini" not in mid.lower():
      continue
    # Strictly exclude image generation (e.g. Nano Banana, Imagen), video (Veo), audio (Lyria, TTS), embeddings, computer-use
    if any(ex in combined for ex in ["image", "banana", "imagen", "veo", "lyria", "tts", "embedding", "computer-use", "live-translate"]):
      continue
    ctx = (item.get("limit") or {}).get("context") or 1048576
    cost = item.get("cost")
    collected.append(
      _enrich_gemini_model(
        raw_id=mid,
        name=name,
        desc=desc,
        cost=cost,
        context_len=ctx,
      )
    )

  # 3. OpenAI models
  openai_section = data.get("openai", {}).get("models", {})
  for mid, item in openai_section.items():
    if "dall-e" in mid.lower() or "tts" in mid.lower() or "embedding" in mid.lower():
      continue
    if not (mid.startswith("gpt-") or mid.startswith("o1") or mid.startswith("o3") or mid.startswith("o4") or "whisper" in mid.lower()):
      continue
    ctx = (item.get("limit") or {}).get("context") or 128000
    cost = item.get("cost")
    collected.append(
      _enrich_openai_model(
        raw_id=mid,
        name=item.get("name") or mid,
        desc=item.get("description") or "",
        cost=cost,
        context_len=ctx,
      )
    )

  # 4. Anthropic Claude models
  claude_section = data.get("anthropic", {}).get("models", {})
  for mid, item in claude_section.items():
    if "claude" not in mid.lower():
      continue
    ctx = (item.get("limit") or {}).get("context") or 200000
    cost = item.get("cost")
    collected.append(
      _enrich_claude_model(
        raw_id=mid,
        name=item.get("name") or mid,
        desc=item.get("description") or "",
        cost=cost,
        context_len=ctx,
      )
    )

  return collected


async def _fetch_from_openrouter() -> list[AIModelInfo]:
  """Secondary external fallback: https://openrouter.ai/api/v1/models."""
  url = "https://openrouter.ai/api/v1/models"
  async with httpx.AsyncClient(timeout=12.0) as client:
    res = await client.get(url, headers={"User-Agent": "QA-MGMT/0.2.0"})
    res.raise_for_status()
    data = res.json().get("data", [])

  collected: list[AIModelInfo] = []
  for item in data:
    mid = item.get("id", "")
    pricing = item.get("pricing") or {}
    try:
      p_in = float(pricing.get("prompt") or 0.0) * 1_000_000
      p_out = float(pricing.get("completion") or 0.0) * 1_000_000
    except (ValueError, TypeError):
      p_in, p_out = 0.0, 0.0

    cost = {"input": p_in, "output": p_out}
    ctx = item.get("context_length") or 128000
    name = item.get("name") or mid
    desc = item.get("description") or ""

    if mid.startswith("openai/"):
      clean_id = mid.replace("openai/", "")
      if clean_id.startswith("gpt-") or clean_id.startswith("o1") or clean_id.startswith("o3") or "whisper" in clean_id:
        collected.append(_enrich_openai_model(mid, name, desc, cost, ctx))
    elif mid.startswith("anthropic/"):
      clean_id = mid.replace("anthropic/", "")
      if "claude" in clean_id:
        collected.append(_enrich_claude_model(mid, name, desc, cost, ctx))
    elif mid.startswith("google/"):
      clean_id = mid.replace("google/", "")
      combined = f"{clean_id} {name} {desc}".lower()
      if "gemini" in clean_id and not any(ex in combined for ex in ["image", "banana", "imagen", "veo", "lyria", "tts", "embedding", "computer-use", "live-translate"]):
        collected.append(_enrich_gemini_model(mid, name, desc, cost, ctx))
    elif "llama-3" in mid.lower() or "mixtral" in mid.lower() or "whisper" in mid.lower():
      clean_id = mid.split("/")[-1]
      collected.append(_enrich_groq_model(mid, name, desc, ctx))

  return collected


async def get_model_catalog(
    refresh: bool = False,
    provider: str = "all",
    task_type: str = "all",
) -> ModelCatalogResponse:
  """Retrieve model catalog from external medium or cache without hardcoded fallbacks."""
  cached_models, cache_ts = _load_cache()
  is_cache_fresh = (time.time() - cache_ts) < CACHE_TTL_SECONDS
  models: list[AIModelInfo] = []
  source = "cache"
  error_msg: str | None = None

  if not refresh and cached_models and is_cache_fresh:
    models = cached_models
    source = "local_cache"
  else:
    try:
      models = await _fetch_from_models_dev()
      if models:
        _save_cache(models)
        source = "models.dev (en vivo)"
    except Exception as e:
      logger.warning(f"Failed to fetch from models.dev: {e}, attempting OpenRouter fallback...")
      try:
        models = await _fetch_from_openrouter()
        if models:
          _save_cache(models)
          source = "openrouter.ai (en vivo)"
      except Exception as err2:
        logger.warning(f"Failed to fetch from OpenRouter fallback: {err2}")
        if cached_models:
          models = cached_models
          source = "local_cache_stale"
        else:
          models = []
          source = "error"
          error_msg = "Error de conexión, no se pudo obtener los modelos"

  if not models and not error_msg:
    if cached_models:
      models = cached_models
      source = "local_cache"
    else:
      error_msg = "Error de conexión, no se pudo obtener los modelos"
      source = "error"

  if provider and provider != "all":
    prov_key = provider.lower()
    if prov_key in {"anthropic", "claude"}:
      models = [m for m in models if m.provider == "claude"]
    elif prov_key in {"google", "gemini"}:
      models = [m for m in models if m.provider == "gemini"]
    else:
      models = [m for m in models if m.provider == prov_key]

  if task_type and task_type != "all":
    task_key = task_type.lower()
    models = [m for m in models if m.task_type == task_key]

  updated_time = datetime.fromtimestamp(cache_ts or time.time(), tz=timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

  return ModelCatalogResponse(
    updated_at=updated_time,
    source=source,
    providers=["groq", "gemini", "openai", "claude", "ollama"],
    models=models,
    error=error_msg,
  )
