"""AI provider abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class AIMessage(BaseModel):
  role: str
  content: str


class AICompletion(BaseModel):
  text: str
  provider: str
  model: str
  raw: dict[str, Any] = Field(default_factory=dict)


class AIProvider(ABC):
  id: str
  name: str

  @abstractmethod
  async def complete(self, messages: list[AIMessage], *, model: str | None = None) -> AICompletion:
    raise NotImplementedError
