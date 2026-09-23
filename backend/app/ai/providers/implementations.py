from __future__ import annotations

import litellm
from typing import Any

from app.ai.providers.base import AICompletion, AIMessage, AIProvider

# Disable litellm telemetry and set quiet mode
litellm.telemetry = False
litellm.suppress_debug_info = True


class LiteLLMProvider(AIProvider):
  id = "litellm"
  name = "LiteLLM Unified Provider"

  def __init__(
    self,
    provider_id: str,
    api_key: str | None = None,
    base_url: str | None = None,
    default_model: str = "gpt-4o-mini",
  ) -> None:
    self.id = provider_id
    self.api_key = api_key
    self.base_url = base_url
    self.default_model = default_model

  def _format_model_name(self, model: str) -> str:
    m = model.strip()
    # Normalize model prefixes for LiteLLM format
    if self.id == "groq":
      if m.startswith("groq/"):
        return m
      return f"groq/{m}"
    if self.id in {"claude", "anthropic"}:
      if m.startswith("anthropic/"):
        return m
      return f"anthropic/{m}"
    if self.id in {"gemini", "google"}:
      if m.startswith("gemini/"):
        return m
      if m.startswith("models/"):
        return f"gemini/{m[7:]}"
      return f"gemini/{m}"
    if self.id in {"ollama", "builtin", "local"}:
      if m.startswith("ollama/"):
        return m
      if m.startswith("ollama_chat/"):
        return m
      return f"ollama_chat/{m}"
    if self.id == "openai":
      if m.startswith("openai/"):
        return m[7:]
      return m
    return m

  async def complete(self, messages: list[AIMessage], *, model: str | None = None) -> AICompletion:
    chosen_raw = model or self.default_model
    formatted_model = self._format_model_name(chosen_raw)

    kwargs: dict[str, Any] = {
      "model": formatted_model,
      "messages": [message.model_dump() for message in messages],
      "temperature": 0.2,
    }
    if self.api_key:
      kwargs["api_key"] = self.api_key
    if self.base_url:
      kwargs["api_base"] = self.base_url

    response = await litellm.acompletion(**kwargs)
    raw_dict = response.model_dump() if hasattr(response, "model_dump") else dict(response)

    text = ""
    if hasattr(response, "choices") and response.choices:
      choice = response.choices[0]
      if hasattr(choice, "message") and hasattr(choice.message, "content"):
        text = choice.message.content or ""

    clean_model_name = chosen_raw.split("/")[-1] if "/" in chosen_raw else chosen_raw
    return AICompletion(text=text, provider=self.id, model=clean_model_name, raw=raw_dict)


class OpenAIProvider(LiteLLMProvider):
  name = "OpenAI"

  def __init__(self, api_key: str, default_model: str = "gpt-4o-mini") -> None:
    super().__init__("openai", api_key=api_key, default_model=default_model)


class ClaudeProvider(LiteLLMProvider):
  name = "Claude"

  def __init__(self, api_key: str, default_model: str = "claude-3-5-haiku-latest") -> None:
    super().__init__("claude", api_key=api_key, default_model=default_model)


class GroqProvider(LiteLLMProvider):
  name = "Groq"

  def __init__(self, api_key: str, default_model: str = "llama-3.3-70b-versatile") -> None:
    super().__init__("groq", api_key=api_key, default_model=default_model)


class GeminiProvider(LiteLLMProvider):
  name = "Google Gemini"

  def __init__(self, api_key: str, default_model: str = "gemini-1.5-flash") -> None:
    super().__init__("gemini", api_key=api_key, default_model=default_model)


class OllamaProvider(LiteLLMProvider):
  name = "Ollama (local)"

  def __init__(self, base_url: str = "http://127.0.0.1:11434", default_model: str = "llama3.2") -> None:
    super().__init__("ollama", base_url=base_url, default_model=default_model)
