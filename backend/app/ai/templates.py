"""Editable prompt templates and rubrics stored as local files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.settings import LOCAL_DIR, ensure_local_dirs

AI_DIR = LOCAL_DIR / "ai"
PROMPTS_DIR = AI_DIR / "prompts"
RUBRICS_DIR = AI_DIR / "rubrics"

DEFAULT_PROMPTS: dict[str, dict[str, Any]] = {
  "standup": {
    "version": 1,
    "feature": "standup",
    "allowed_sources": ["jira", "github"],
    "system": (
      "You are a PM standup assistant. Answer ONLY from the provided context chunks. "
      "If context is missing for yesterday/today/blocked/risks, say so explicitly. "
      "Do not invent tickets, PRs, or blockers from general knowledge."
    ),
    "user_template": (
      "Generate a standup using ONLY this context.\n\n"
      "CONTEXT:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown with sections: Yesterday, Today, Blocked, Risks."
    ),
  },
  "ask_product": {
    "version": 1,
    "feature": "ask_product",
    "allowed_sources": ["jira", "github", "gitlab", "knowledge"],
    "system": (
      "You answer product questions using ONLY the provided context. "
      "If the answer is not in the context, say: "
      "\"Not found in connected sources.\" Cite chunk numbers you used."
    ),
    "user_template": (
      "Question: {query}\n\n"
      "UPLOADED DOCUMENT CONTEXT:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Answer with citations like [1], [2]."
    ),
  },
  "prd_checker": {
    "version": 1,
    "feature": "prd_checker",
    "allowed_sources": ["knowledge"],
    "system": (
      "You are a senior PM reviewing PRDs and specs. Use ONLY the uploaded documents "
      "and any additional chat context provided. Score clarity, completeness, and risks. "
      "Do not invent requirements not present in the files. Cite chunk numbers."
    ),
    "user_template": (
      "Review request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "DOCUMENTS & SOURCES:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown with: Executive summary, Strengths, Gaps, Risks, Recommendations. "
      "Cite evidence as [1], [2]."
    ),
  },
  "change_impact": {
    "version": 1,
    "feature": "change_impact",
    "allowed_sources": ["jira", "github", "gitlab", "knowledge"],
    "system": (
      "You analyze product or engineering change impact using ONLY provided context. "
      "Map affected tickets, code areas, docs, and stakeholders when evidence exists. "
      "Never guess files or people not mentioned in context."
    ),
    "user_template": (
      "Change to analyze: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown with: Change summary, Impacted areas, Tickets/PRs, Docs, "
      "Stakeholders, Risks, Suggested next steps. Cite as [1], [2]."
    ),
  },
  "regression": {
    "version": 1,
    "feature": "regression",
    "allowed_sources": ["jira", "github", "gitlab", "knowledge"],
    "system": (
      "You are a QA lead planning regression testing. Use ONLY provided context. "
      "Suggest test scope, priority flows, and risk areas. Never invent features not in context."
    ),
    "user_template": (
      "Regression request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown: Scope summary, High-priority flows, Medium/low areas, "
      "Data/setup notes, Out of scope. Cite as [1], [2]."
    ),
  },
  "api_qa": {
    "version": 1,
    "feature": "api_qa",
    "allowed_sources": ["knowledge", "github", "gitlab"],
    "system": (
      "You are an API QA specialist. Analyze specs and code context ONLY. "
      "Identify untested endpoints, edge cases, and auth/error scenarios. No invented endpoints."
    ),
    "user_template": (
      "API QA request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown: Coverage summary, Gaps, Negative tests, Auth/security checks, "
      "Suggested cases. Cite as [1], [2]."
    ),
  },
  "visual_qa": {
    "version": 1,
    "feature": "visual_qa",
    "allowed_sources": ["knowledge", "jira"],
    "system": (
      "You create visual/UI QA checklists from specs and acceptance criteria ONLY. "
      "Do not assume designs not described in context."
    ),
    "user_template": (
      "Visual QA request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown: Checklist, Responsive states, Accessibility checks, "
      "Edge UI states, Sign-off criteria. Cite as [1], [2]."
    ),
  },
  "smart_test_data": {
    "version": 1,
    "feature": "smart_test_data",
    "allowed_sources": ["knowledge"],
    "system": (
      "You generate test data scenarios from schemas and business rules in context ONLY. "
      "Respect constraints and formats found in documents."
    ),
    "user_template": (
      "Test data request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown: Scenarios, Valid examples, Boundary/invalid cases, "
      "Setup notes. Cite as [1], [2]."
    ),
  },
  "release_readiness": {
    "version": 1,
    "feature": "release_readiness",
    "allowed_sources": ["jira", "github", "gitlab", "knowledge"],
    "system": (
      "You assess release readiness from tickets, PRs/MRs, and checklists ONLY. "
      "Give ship/no-ship signals based on evidence, not assumptions."
    ),
    "user_template": (
      "Release readiness request: {query}\n\n"
      "ADDITIONAL CONTEXT FROM CHAT:\n{chat_context}\n\n"
      "EVIDENCE:\n{context}\n\n"
      "RUBRIC:\n{rubric}\n\n"
      "Return markdown: Readiness verdict, Blockers, Open risks, QA gaps, "
      "Recommended actions before ship. Cite as [1], [2]."
    ),
  },
}

DEFAULT_RUBRICS: dict[str, dict[str, Any]] = {
  "standup": {
    "version": 1,
    "feature": "standup",
    "criteria": [
      "Yesterday covers completed work with concrete ticket/PR references when present",
      "Today is actionable and grounded in open issues or active PRs",
      "Blocked only lists items present in context",
      "Risks call out release/timeline threats only if evidence exists",
      "Never invent work that is not in context",
    ],
  },
  "ask_product": {
    "version": 1,
    "feature": "ask_product",
    "criteria": [
      "Answer only from retrieved chunks",
      "Cite sources",
      "Refuse clearly when evidence is missing",
      "Do not generalize from industry norms",
    ],
  },
  "prd_checker": {
    "version": 1,
    "feature": "prd_checker",
    "criteria": [
      "Ground every finding in uploaded document text",
      "Call out missing acceptance criteria, edge cases, and success metrics",
      "Separate confirmed facts from assumptions",
      "Provide actionable recommendations ranked by severity",
      "Refuse if no document content was provided",
    ],
  },
  "change_impact": {
    "version": 1,
    "feature": "change_impact",
    "criteria": [
      "List impacted tickets, MRs/PRs, and files only when present in context",
      "Identify doc updates needed when specs or PRDs are in context",
      "Flag missing evidence instead of inventing impact",
      "Suggest verification steps grounded in connected sources",
      "Use citations for every impact claim",
    ],
  },
  "regression": {
    "version": 1,
    "feature": "regression",
    "criteria": [
      "Prioritize flows mentioned in recent changes or tickets",
      "Separate must-test from nice-to-have based on evidence",
      "Reference specific tickets, PRs, or doc sections",
      "Flag when change scope is unclear",
    ],
  },
  "api_qa": {
    "version": 1,
    "feature": "api_qa",
    "criteria": [
      "Cover endpoints present in uploaded specs only",
      "Include negative and auth scenarios when spec implies them",
      "Call out missing error codes or validation rules",
      "Cite spec sections for each gap",
    ],
  },
  "visual_qa": {
    "version": 1,
    "feature": "visual_qa",
    "criteria": [
      "Checklist items map to stated UI requirements",
      "Include responsive and empty/error states when spec mentions them",
      "Accessibility checks when criteria exist in context",
    ],
  },
  "smart_test_data": {
    "version": 1,
    "feature": "smart_test_data",
    "criteria": [
      "Respect field types and constraints from schemas",
      "Include boundary and invalid cases",
      "Explain setup dependencies",
    ],
  },
  "release_readiness": {
    "version": 1,
    "feature": "release_readiness",
    "criteria": [
      "Verdict tied to open blockers in Jira/GitHub/GitLab",
      "Separate ship blockers from follow-ups",
      "Cite evidence for each risk",
    ],
  },
}


def ensure_ai_files() -> None:
  ensure_local_dirs()
  PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
  RUBRICS_DIR.mkdir(parents=True, exist_ok=True)
  for feature, payload in DEFAULT_PROMPTS.items():
    path = PROMPTS_DIR / f"{feature}.json"
    if not path.exists():
      path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
  for feature, payload in DEFAULT_RUBRICS.items():
    path = RUBRICS_DIR / f"{feature}.json"
    if not path.exists():
      path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def list_prompts() -> list[dict[str, Any]]:
  ensure_ai_files()
  return [_read(path) for path in sorted(PROMPTS_DIR.glob("*.json"))]


def list_rubrics() -> list[dict[str, Any]]:
  ensure_ai_files()
  return [_read(path) for path in sorted(RUBRICS_DIR.glob("*.json"))]


def get_prompt(feature: str) -> dict[str, Any]:
  ensure_ai_files()
  path = PROMPTS_DIR / f"{feature}.json"
  if not path.exists():
    raise KeyError(f"Unknown prompt feature: {feature}")
  return _read(path)


def get_rubric(feature: str) -> dict[str, Any]:
  ensure_ai_files()
  path = RUBRICS_DIR / f"{feature}.json"
  if not path.exists():
    raise KeyError(f"Unknown rubric feature: {feature}")
  return _read(path)


def save_prompt(feature: str, payload: dict[str, Any]) -> dict[str, Any]:
  ensure_ai_files()
  current = get_prompt(feature)
  merged = {**current, **payload, "feature": feature}
  merged["version"] = int(current.get("version") or 1) + 1
  path = PROMPTS_DIR / f"{feature}.json"
  path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
  return merged


def save_rubric(feature: str, payload: dict[str, Any]) -> dict[str, Any]:
  ensure_ai_files()
  current = get_rubric(feature)
  merged = {**current, **payload, "feature": feature}
  merged["version"] = int(current.get("version") or 1) + 1
  path = RUBRICS_DIR / f"{feature}.json"
  path.write_text(json.dumps(merged, indent=2), encoding="utf-8")
  return merged


def rubric_to_text(rubric: dict[str, Any]) -> str:
  criteria = rubric.get("criteria") or []
  return "\n".join(f"- {item}" for item in criteria)


def _read(path: Path) -> dict[str, Any]:
  return json.loads(path.read_text(encoding="utf-8"))
