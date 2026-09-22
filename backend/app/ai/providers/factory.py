"""Resolve configured AI provider from local settings + env."""

from __future__ import annotations

import os
from typing import Any

from app.ai.providers.base import AIProvider
from app.ai.providers.implementations import ClaudeProvider, OllamaProvider, OpenAIProvider
from app.core.storage import load_app_settings


def get_ai_settings() -> dict[str, Any]:
  settings = load_app_settings()
  ai = settings.get("ai") or {}
  return {
    "provider": ai.get("provider") or os.getenv("AI_PROVIDER", ""),
    "model": ai.get("model") or os.getenv("AI_MODEL", ""),
    "openai_api_key": ai.get("openai_api_key") or os.getenv("OPENAI_API_KEY", ""),
    "claude_api_key": ai.get("claude_api_key") or os.getenv("ANTHROPIC_API_KEY", ""),
    "ollama_base_url": ai.get("ollama_base_url") or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
  }


def resolve_provider() -> AIProvider:
  config = get_ai_settings()
  provider = (config.get("provider") or "").lower()
  if provider == "openai":
    key = config.get("openai_api_key") or ""
    if not key:
      raise ValueError("OpenAI is selected but OPENAI_API_KEY / settings key is missing.")
    return OpenAIProvider(key, default_model=config.get("model") or "gpt-4o-mini")
  if provider in {"claude", "anthropic"}:
    key = config.get("claude_api_key") or ""
    if not key:
      raise ValueError("Claude is selected but ANTHROPIC_API_KEY / settings key is missing.")
    return ClaudeProvider(key, default_model=config.get("model") or "claude-3-5-haiku-latest")
  if provider == "ollama":
    return OllamaProvider(
      base_url=config.get("ollama_base_url") or "http://127.0.0.1:11434",
      default_model=config.get("model") or "llama3.2",
    )
  raise ValueError(
    "No AI provider configured. Set provider in Settings (openai | claude | ollama) and provide credentials."
  )
