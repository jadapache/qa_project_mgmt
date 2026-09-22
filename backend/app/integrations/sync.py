"""Pull live integration data into local cache after connect."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.core.settings import CACHE_DIR, ensure_local_dirs
from app.integrations.registry import GIT_HOSTING_IDS, registry


async def sync_integration(integration_id: str) -> dict[str, Any]:
  ensure_local_dirs()
  CACHE_DIR.mkdir(parents=True, exist_ok=True)

  integration = registry.get(integration_id)
  if not await integration.authenticate():
    raise ValueError(f"{integration_id} is not connected.")

  synced_at = datetime.now(timezone.utc).isoformat()
  payload: dict[str, Any] = {
    "integration_id": integration_id,
    "synced_at": synced_at,
    "data": {},
  }

  if integration_id == "jira":
    payload["data"]["issues"] = await integration.get_issues(max_results=50)  # type: ignore[attr-defined]
    payload["data"]["projects"] = await integration.get_projects()  # type: ignore[attr-defined]
    payload["data"]["sprints"] = await integration.get_sprints()  # type: ignore[attr-defined]

  elif integration_id in GIT_HOSTING_IDS:
    payload["data"]["repositories"] = await integration.get_repositories()  # type: ignore[attr-defined]
    payload["data"]["pull_requests"] = await integration.get_pull_requests(max_results=30)  # type: ignore[attr-defined]
    payload["data"]["commits"] = await integration.get_commits(max_results=30)  # type: ignore[attr-defined]

    if integration_id == "gitlab":
      payload["data"]["issues"] = await integration.get_issues(max_results=30)  # type: ignore[attr-defined]

    prs = payload["data"].get("pull_requests") or []
    files_changed: list[dict[str, Any]] = []
    if prs and hasattr(integration, "get_files_changed"):
      first = prs[0]
      number = first.get("number")
      repo = first.get("repo")
      if number and repo:
        try:
          files_changed = await integration.get_files_changed(pr_number=int(number), repo=str(repo))  # type: ignore[attr-defined]
        except Exception:
          files_changed = []
    payload["data"]["files_changed"] = files_changed

  cache_path = CACHE_DIR / f"{integration_id}_sync.json"
  cache_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
  return payload


def load_sync_cache(integration_id: str) -> dict[str, Any] | None:
  ensure_local_dirs()
  path = CACHE_DIR / f"{integration_id}_sync.json"
  if not path.exists():
    return None
  try:
    return json.loads(path.read_text(encoding="utf-8"))
  except (json.JSONDecodeError, OSError):
    return None
