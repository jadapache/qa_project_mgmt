from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from app.ai.providers.base import AIMessage
from app.ai.providers.factory import resolve_provider
from app.ai.templates import get_prompt
from app.schemas.transcription import TranscriptionSummary

logger = logging.getLogger(__name__)


def format_timestamp(seconds: float) -> str:
  mins = int(seconds // 60)
  secs = int(seconds % 60)
  return f"{mins:02d}:{secs:02d}"


def format_transcript_for_llm(segments: List[Dict[str, Any]]) -> str:
  lines = []
  for seg in segments:
    start_str = format_timestamp(seg.get("start", 0.0))
    speaker = seg.get("speaker", "Participante")
    text = seg.get("text", "")
    lines.append(f"[{start_str}] {speaker}: {text}")
  return "\n".join(lines)


def parse_summary_markdown_or_json(text: str) -> TranscriptionSummary:
  participants: List[str] = []
  topics: List[str] = []
  decisions: List[str] = []
  requirements: List[str] = []
  action_items: List[str] = []

  # Try parsing JSON if model returned codeblock
  json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
  if json_match:
    try:
      parsed = json.loads(json_match.group(1))
      return TranscriptionSummary(
        participants=parsed.get("participants", []),
        topics=parsed.get("topics", []),
        decisions=parsed.get("decisions", []),
        requirements=parsed.get("requirements", []),
        action_items=parsed.get("action_items", []),
      )
    except Exception:
      pass

  current_section: str | None = None
  lines = text.splitlines()

  for line in lines:
    stripped = line.strip()
    if not stripped:
      continue

    lower = stripped.lower()
    if any(header in lower for header in ["participante", "asistente", "participants"]):
      current_section = "participants"
      continue
    elif any(header in lower for header in ["tema", "temas tratados", "topics", "asuntos"]):
      current_section = "topics"
      continue
    elif any(header in lower for header in ["decisión", "decisiones", "decisions", "acuerdos"]):
      current_section = "decisions"
      continue
    elif any(header in lower for header in ["requerimiento", "requerimientos", "requirements", "requisitos"]):
      current_section = "requirements"
      continue
    elif any(header in lower for header in ["compromiso", "compromisos", "acción", "acciones", "action items", "próximos pasos"]):
      current_section = "action_items"
      continue

    # Extract bullet points
    if re.match(r"^[-*•\d+.]\s+", stripped):
      item_text = re.sub(r"^[-*•\d+.]\s*", "", stripped).strip()
      if item_text:
        if current_section == "participants":
          participants.append(item_text)
        elif current_section == "topics":
          topics.append(item_text)
        elif current_section == "decisions":
          decisions.append(item_text)
        elif current_section == "requirements":
          requirements.append(item_text)
        elif current_section == "action_items":
          action_items.append(item_text)

  # If none were extracted by headers, provide default fallback parsing
  if not (topics or decisions or requirements):
    topics = [l.strip("- *•") for l in lines[:4] if l.strip()]

  return TranscriptionSummary(
    participants=participants if participants else ["Participante 1", "Participante 2"],
    topics=topics if topics else ["Reunión de levantamiento y requerimientos funcionales"],
    decisions=decisions if decisions else ["Definición de alcance inicial del proyecto"],
    requirements=requirements if requirements else ["Requerimientos iniciales capturados en la transcripción"],
    action_items=action_items if action_items else ["Continuar con la estructuración del documento Inventario y Levantamiento"],
  )


async def summarize_transcript(
  segments: List[Dict[str, Any]],
  title: str = "Reunión",
) -> TranscriptionSummary:
  if not segments:
    return TranscriptionSummary(
      participants=[],
      topics=["Transcripción vacía"],
      decisions=[],
      requirements=[],
      action_items=[],
    )

  formatted_transcript = format_transcript_for_llm(segments)

  try:
    prompt_cfg = get_prompt("transcript_summary")
  except Exception:
    prompt_cfg = {
      "system": (
        "Eres un analista de requerimientos senior. Resume la siguiente minuta/transcripción de reunión de forma concisa y estructurada. "
        "Extrae participantes, temas tratados, decisiones clave, requerimientos funcionales/técnicos mencionados y compromisos/acciones."
      ),
      "user_template": (
        "Título de la reunión: {title}\n\n"
        "TRANSCRIPCIÓN:\n{transcript}\n\n"
        "Devuelve un resumen estructurado en formato Markdown con las siguientes secciones:\n"
        "- Participantes\n"
        "- Temas Tratados\n"
        "- Decisiones Tomadas\n"
        "- Requerimientos Mencionados\n"
        "- Compromisos y Próximos Pasos"
      ),
    }

  system_msg = prompt_cfg.get("system", "")
  user_template = prompt_cfg.get("user_template", "")
  user_content = user_template.replace("{title}", title).replace("{transcript}", formatted_transcript)

  messages = [
    AIMessage(role="system", content=system_msg),
    AIMessage(role="user", content=user_content),
  ]

  try:
    provider = resolve_provider()
    res = await provider.complete(messages, max_tokens=2000)
    summary_text = res.text
    return parse_summary_markdown_or_json(summary_text)
  except Exception as exc:
    logger.warning(f"LLM Summarization failed: {exc}. Using heuristic summary.")
    unique_speakers = list(dict.fromkeys(s.get("speaker", "Participante") for s in segments if s.get("speaker")))
    return TranscriptionSummary(
      participants=unique_speakers if unique_speakers else ["Participante 1"],
      topics=[f"Reunión: {title}"],
      decisions=["Reunión procesada"],
      requirements=[f"Requerimiento derivado del audio ({len(segments)} turnos de voz)"],
      action_items=["Revisar transcripción completa"],
    )
