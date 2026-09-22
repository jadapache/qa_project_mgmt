from __future__ import annotations

import httpx

from app.ai.providers.base import AICompletion, AIMessage, AIProvider


class OpenAIProvider(AIProvider):
  id = "openai"
  name = "OpenAI"

  def __init__(self, api_key: str, default_model: str = "gpt-4o-mini") -> None:
    self.api_key = api_key
    self.default_model = default_model

  async def complete(self, messages: list[AIMessage], *, model: str | None = None) -> AICompletion:
    chosen = model or self.default_model
    async with httpx.AsyncClient(timeout=90.0) as client:
      response = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
          "Authorization": f"Bearer {self.api_key}",
          "Content-Type": "application/json",
        },
        json={
          "model": chosen,
          "messages": [message.model_dump() for message in messages],
          "temperature": 0.2,
        },
      )
      response.raise_for_status()
      body = response.json()
    text = body["choices"][0]["message"]["content"]
    return AICompletion(text=text, provider=self.id, model=chosen, raw=body)


class ClaudeProvider(AIProvider):
  id = "claude"
  name = "Claude"

  def __init__(self, api_key: str, default_model: str = "claude-3-5-haiku-latest") -> None:
    self.api_key = api_key
    self.default_model = default_model

  async def complete(self, messages: list[AIMessage], *, model: str | None = None) -> AICompletion:
    chosen = model or self.default_model
    system = "\n".join(m.content for m in messages if m.role == "system")
    chat = [m for m in messages if m.role != "system"]
    async with httpx.AsyncClient(timeout=90.0) as client:
      response = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={
          "x-api-key": self.api_key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        json={
          "model": chosen,
          "max_tokens": 2000,
          "system": system or "You are a grounded PM/QA assistant.",
          "messages": [{"role": m.role, "content": m.content} for m in chat],
        },
      )
      response.raise_for_status()
      body = response.json()
    text = "".join(part.get("text", "") for part in body.get("content", []) if part.get("type") == "text")
    return AICompletion(text=text, provider=self.id, model=chosen, raw=body)


class OllamaProvider(AIProvider):
  id = "ollama"
  name = "Ollama (local)"

  def __init__(self, base_url: str = "http://127.0.0.1:11434", default_model: str = "llama3.2") -> None:
    self.base_url = base_url.rstrip("/")
    self.default_model = default_model

  async def complete(self, messages: list[AIMessage], *, model: str | None = None) -> AICompletion:
    chosen = model or self.default_model
    async with httpx.AsyncClient(timeout=120.0) as client:
      response = await client.post(
        f"{self.base_url}/api/chat",
        json={
          "model": chosen,
          "messages": [message.model_dump() for message in messages],
          "stream": False,
        },
      )
      response.raise_for_status()
      body = response.json()
    text = (body.get("message") or {}).get("content") or ""
    return AICompletion(text=text, provider=self.id, model=chosen, raw=body)
