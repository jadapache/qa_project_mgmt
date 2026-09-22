from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ai.logging import list_logs
from app.ai.providers.factory import get_ai_settings
from app.ai.runner import run_grounded_feature
from app.ai.templates import get_prompt, get_rubric, list_prompts, list_rubrics, save_prompt, save_rubric
from app.core.storage import load_app_settings, save_app_settings
from app.features.standup.service import generate_standup

router = APIRouter(tags=["ai"])


class AISettingsUpdate(BaseModel):
  provider: str | None = None
  model: str | None = None
  openai_api_key: str | None = None
  claude_api_key: str | None = None
  ollama_base_url: str | None = None


class GroundedRequest(BaseModel):
  query: str = "Generate standup from recent work."
  sources: list[str] | None = None
  document_ids: list[str] | None = None
  chat_context: str | None = None


class FeatureWorkspaceRequest(BaseModel):
  query: str = Field(min_length=1)
  sources: list[str] | None = None
  document_ids: list[str] = Field(default_factory=list)
  chat_context: str | None = None


class TemplateUpdate(BaseModel):
  system: str | None = None
  user_template: str | None = None
  allowed_sources: list[str] | None = None


class RubricUpdate(BaseModel):
  criteria: list[str]


@router.get("/ai/settings")
async def ai_settings() -> dict[str, Any]:
  config = get_ai_settings()
  return {
    "provider": config.get("provider") or "",
    "model": config.get("model") or "",
    "openai_api_key_set": bool(config.get("openai_api_key")),
    "claude_api_key_set": bool(config.get("claude_api_key")),
    "ollama_base_url": config.get("ollama_base_url"),
  }


@router.put("/ai/settings")
async def update_ai_settings(body: AISettingsUpdate) -> dict[str, Any]:
  current = load_app_settings()
  ai = dict(current.get("ai") or {})
  for key, value in body.model_dump(exclude_none=True).items():
    ai[key] = value
  save_app_settings({"ai": ai})
  return await ai_settings()


@router.get("/ai/prompts")
async def prompts() -> dict[str, Any]:
  return {"prompts": list_prompts()}


@router.get("/ai/prompts/{feature}")
async def prompt_detail(feature: str) -> dict[str, Any]:
  try:
    return get_prompt(feature)
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/ai/prompts/{feature}")
async def update_prompt(feature: str, body: TemplateUpdate) -> dict[str, Any]:
  try:
    return save_prompt(feature, body.model_dump(exclude_none=True))
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/ai/rubrics")
async def rubrics() -> dict[str, Any]:
  return {"rubrics": list_rubrics()}


@router.get("/ai/rubrics/{feature}")
async def rubric_detail(feature: str) -> dict[str, Any]:
  try:
    return get_rubric(feature)
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/ai/rubrics/{feature}")
async def update_rubric(feature: str, body: RubricUpdate) -> dict[str, Any]:
  try:
    return save_rubric(feature, body.model_dump())
  except KeyError as exc:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/ai/logs")
async def ai_logs(limit: int = 20) -> dict[str, Any]:
  return {"logs": list_logs(limit=limit)}


@router.post("/features/standup")
async def standup(body: GroundedRequest = GroundedRequest()) -> dict[str, Any]:
  try:
    return await generate_standup(body.query)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/features/ask")
async def ask_product(body: GroundedRequest) -> dict[str, Any]:
  if not body.query.strip():
    raise HTTPException(status_code=400, detail="Query is required.")
  try:
    return await run_grounded_feature(
      feature="ask_product",
      query=body.query,
      sources=body.sources,
      document_ids=body.document_ids,
      chat_context=body.chat_context,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/features/prd-checker")
async def prd_checker(body: FeatureWorkspaceRequest) -> dict[str, Any]:
  if not body.document_ids:
    raise HTTPException(status_code=400, detail="Upload at least one PRD or spec file.")
  try:
    return await run_grounded_feature(
      feature="prd_checker",
      query=body.query,
      sources=body.sources or ["knowledge"],
      document_ids=body.document_ids,
      chat_context=body.chat_context,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/features/change-impact")
async def change_impact(body: FeatureWorkspaceRequest) -> dict[str, Any]:
  sources = body.sources or []
  if not body.document_ids and not sources:
    raise HTTPException(
      status_code=400,
      detail="Upload files and/or enable live sources (Jira, GitHub, GitLab).",
    )
  try:
    return await run_grounded_feature(
      feature="change_impact",
      query=body.query,
      sources=body.sources or ["jira", "github", "knowledge"],
      document_ids=body.document_ids,
      chat_context=body.chat_context,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc)) from exc


QA_FEATURE_KEYS = {
  "regression",
  "api_qa",
  "visual_qa",
  "smart_test_data",
  "release_readiness",
}

QA_DEFAULT_SOURCES: dict[str, list[str]] = {
  "regression": ["jira", "github", "gitlab", "knowledge"],
  "api_qa": ["knowledge", "github", "gitlab"],
  "visual_qa": ["knowledge", "jira"],
  "smart_test_data": ["knowledge"],
  "release_readiness": ["jira", "github", "gitlab", "knowledge"],
}


@router.post("/features/qa/{feature_key}")
async def qa_feature(feature_key: str, body: FeatureWorkspaceRequest) -> dict[str, Any]:
  if feature_key not in QA_FEATURE_KEYS:
    raise HTTPException(status_code=404, detail=f"Unknown QA feature: {feature_key}")
  sources = body.sources or QA_DEFAULT_SOURCES.get(feature_key, ["knowledge"])
  if not body.document_ids and not sources:
    raise HTTPException(status_code=400, detail="Upload files and/or enable live sources.")
  try:
    return await run_grounded_feature(
      feature=feature_key,
      query=body.query,
      sources=sources,
      document_ids=body.document_ids,
      chat_context=body.chat_context,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    raise HTTPException(status_code=502, detail=str(exc)) from exc
