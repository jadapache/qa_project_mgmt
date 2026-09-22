"""Jira / Atlassian OAuth 3LO + optional PAT adapter."""

from __future__ import annotations

import re
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.integration_config import get_jira_oauth_config
from app.core.storage import delete_connection, load_connection, save_connection
from app.integrations.base import (
  AuthMethod,
  AuthStartResponse,
  Capability,
  ConnectionStatus,
  Integration,
  IntegrationInfo,
  TestConnectionResult,
)

def infer_project_hint_from_url(url: str) -> str | None:
  """Extract a project key or site slug from a Jira URL."""
  if not url:
    return None

  browse_match = re.search(r"/browse/([A-Za-z][A-Za-z0-9]+)-\d+", url)
  if browse_match:
    return browse_match.group(1).upper()

  project_match = re.search(r"/projects/([^/?#]+)", url)
  if project_match:
    return project_match.group(1).upper()

  host_match = re.search(r"https?://([^.]+)\.atlassian\.net", url, re.IGNORECASE)
  if host_match:
    return host_match.group(1).upper()

  return None


def match_project_for_hint(projects: list[dict[str, Any]], hint: str) -> dict[str, Any] | None:
  hint_upper = hint.upper()
  hint_lower = hint.lower()

  for project in projects:
    key = str(project.get("key") or "").upper()
    name = str(project.get("name") or "").lower()
    if key == hint_upper:
      return project
    if hint_lower in name or hint_upper in key or hint_lower in key.lower():
      return project

  return None

ATLASSIAN_AUTHORIZE_URL = "https://auth.atlassian.com/authorize"
ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources"
ATLASSIAN_ME_URL = "https://api.atlassian.com/me"

# Minimal scopes reduce Atlassian consent failures when the developer console
# is missing optional Jira Software permissions. Extra scopes can be added via
# JIRA_OAUTH_EXTRA_SCOPES in .env (space-separated).
JIRA_OAUTH_SCOPES_CORE = [
  "read:jira-work",
  "offline_access",
]

JIRA_OAUTH_SCOPE_GUIDE = [
  {
    "scope": "read:jira-work",
    "label": "View Jira issues and projects",
    "where": "Permissions → Jira API → Configure → View Jira issue data",
    "required": True,
  },
  {
    "scope": "read:jira-user",
    "label": "View user profiles",
    "where": "Permissions → Jira API → Configure → View user profiles",
    "required": False,
  },
  {
    "scope": "read:sprint:jira-software",
    "label": "View sprints",
    "where": "Permissions → Jira Software API → Configure → Read sprints",
    "required": False,
  },
  {
    "scope": "read:board-scope:jira-software",
    "label": "View boards and backlogs",
    "where": "Permissions → Jira Software API → Configure → Read boards",
    "required": False,
  },
  {
    "scope": "offline_access",
    "label": "Refresh tokens (no console toggle needed)",
    "where": "Included automatically in the authorization URL",
    "required": True,
  },
]


def get_jira_oauth_scopes() -> list[str]:
  from app.core.settings import get_settings

  settings = get_settings()
  scopes = list(JIRA_OAUTH_SCOPES_CORE)
  extra = (settings.jira_oauth_extra_scopes or "").strip()
  if extra:
    for item in extra.split():
      if item not in scopes:
        scopes.append(item)
  return scopes


class JiraIntegration(Integration):
  id = "jira"
  name = "Jira"
  description = "Connect Atlassian Jira to pull issues, projects, and sprints."

  def get_capabilities(self) -> list[Capability]:
    return [
      Capability.GET_ISSUES,
      Capability.GET_PROJECTS,
      Capability.GET_SPRINTS,
    ]

  def _oauth_configured(self) -> bool:
    return get_jira_oauth_config()["configured"]

  def _is_connected(self, data: dict | None) -> bool:
    if not data:
      return False
    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      return bool(data.get("pat_token") and data.get("account_email") and data.get("site_url"))
    if data.get("auth_method") == AuthMethod.OAUTH.value:
      return bool(data.get("access_token") and data.get("cloud_id"))
    return False

  def get_info(self) -> IntegrationInfo:
    data = load_connection(self.id)
    oauth_configured = self._oauth_configured()

    if not self._is_connected(data):
      return IntegrationInfo(
        id=self.id,
        name=self.name,
        description=self.description,
        status=ConnectionStatus.NOT_CONNECTED,
        auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
        capabilities=self.get_capabilities(),
        oauth_configured=oauth_configured,
      )

    assert data is not None
    return IntegrationInfo(
      id=self.id,
      name=self.name,
      description=self.description,
      status=ConnectionStatus.CONNECTED,
      auth_methods=[AuthMethod.OAUTH, AuthMethod.PERSONAL_ACCESS_TOKEN],
      capabilities=self.get_capabilities(),
      account_label=data.get("account_email") or data.get("account_label"),
      workspace_label=data.get("site_url") or data.get("workspace_label"),
      details={
        "auth_method": data.get("auth_method"),
        "cloud_id": data.get("cloud_id"),
        "site_name": data.get("site_name"),
        "account_name": data.get("account_name"),
        "selected_project_keys": data.get("selected_project_keys") or [],
      },
      oauth_configured=oauth_configured,
    )

  async def start_oauth(self) -> AuthStartResponse:
    oauth = get_jira_oauth_config()
    if not oauth["configured"]:
      raise ValueError(
        "Jira OAuth is not configured. Add Client ID and Secret in Integrations → Jira OAuth setup, "
        "or set JIRA_CLIENT_ID and JIRA_CLIENT_SECRET in .env"
      )

    state = secrets.token_urlsafe(24)
    pending = load_connection(self.id) or {}
    pending["oauth_state"] = state
    pending["oauth_started_at"] = time.time()
    save_connection(self.id, pending)

    params = {
      "audience": "api.atlassian.com",
      "client_id": oauth["client_id"],
      "scope": " ".join(get_jira_oauth_scopes()),
      "redirect_uri": oauth["redirect_uri"],
      "state": state,
      "response_type": "code",
      "prompt": "consent",
    }
    url = f"{ATLASSIAN_AUTHORIZE_URL}?{urlencode(params)}"
    return AuthStartResponse(
      authorization_url=url,
      state=state,
      auth_method=AuthMethod.OAUTH,
    )

  async def handle_oauth_callback(self, code: str, state: str) -> IntegrationInfo:
    oauth = get_jira_oauth_config()
    pending = load_connection(self.id) or {}
    expected = pending.get("oauth_state")
    if not expected or expected != state:
      raise ValueError("Invalid OAuth state. Restart the Jira connection flow.")

    async with httpx.AsyncClient(timeout=30.0) as client:
      token_response = await client.post(
        ATLASSIAN_TOKEN_URL,
        json={
          "grant_type": "authorization_code",
          "client_id": oauth["client_id"],
          "client_secret": oauth["client_secret"],
          "code": code,
          "redirect_uri": oauth["redirect_uri"],
        },
      )
      if token_response.status_code >= 400:
        body = token_response.text
        raise ValueError(f"Token exchange failed ({token_response.status_code}): {body}")
      tokens = token_response.json()

      access_token = tokens["access_token"]
      headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

      resources_response = await client.get(ATLASSIAN_RESOURCES_URL, headers=headers)
      resources_response.raise_for_status()
      resources = resources_response.json()

      if not resources:
        raise ValueError("No accessible Atlassian sites found for this account.")

      site = resources[0]
      me_response = await client.get(ATLASSIAN_ME_URL, headers=headers)
      me = me_response.json() if me_response.status_code == 200 else {}

    payload = {
      "auth_method": AuthMethod.OAUTH.value,
      "access_token": access_token,
      "refresh_token": tokens.get("refresh_token"),
      "expires_at": time.time() + int(tokens.get("expires_in", 3600)) - 60,
      "token_type": tokens.get("token_type", "Bearer"),
      "scope": tokens.get("scope"),
      "cloud_id": site.get("id"),
      "site_url": site.get("url"),
      "site_name": site.get("name"),
      "account_email": me.get("email"),
      "account_name": me.get("name"),
      "account_label": me.get("email") or me.get("name"),
      "workspace_label": site.get("url"),
      "accessible_resources": [
        {"id": r.get("id"), "name": r.get("name"), "url": r.get("url")} for r in resources
      ],
    }
    save_connection(self.id, payload)
    await self.auto_select_projects_from_url(site.get("url") or "")
    return self.get_info()

  async def connect_with_pat(self, token: str, **kwargs: Any) -> IntegrationInfo:
    email = kwargs.get("email") or kwargs.get("account_email")
    base_url = (kwargs.get("base_url") or kwargs.get("site_url") or "").rstrip("/")
    if not token or not email or not base_url:
      raise ValueError("PAT connection requires token, email, and base_url (e.g. https://company.atlassian.net)")

    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"{base_url}/rest/api/3/myself",
        auth=(email, token),
        headers={"Accept": "application/json"},
      )
      if response.status_code >= 400:
        raise ValueError(f"Jira PAT authentication failed ({response.status_code})")
      me = response.json()

    payload = {
      "auth_method": AuthMethod.PERSONAL_ACCESS_TOKEN.value,
      "pat_token": token,
      "account_email": email,
      "account_name": me.get("displayName"),
      "account_label": email,
      "site_url": base_url,
      "workspace_label": base_url,
      "site_name": base_url.replace("https://", "").replace("http://", ""),
    }
    save_connection(self.id, payload)
    await self.auto_select_projects_from_url(base_url)
    return self.get_info()

  async def disconnect(self) -> None:
    delete_connection(self.id)

  def selected_project_keys(self) -> list[str]:
    data = load_connection(self.id) or {}
    return list(data.get("selected_project_keys") or [])

  async def update_selected_projects(self, project_keys: list[str]) -> IntegrationInfo:
    data = load_connection(self.id)
    if not data or not self._is_connected(data):
      raise ValueError("Jira is not connected.")
    cleaned = [key.strip().upper() for key in project_keys if key and key.strip()]
    data["selected_project_keys"] = cleaned
    save_connection(self.id, data)
    return self.get_info()

  async def auto_select_projects_from_url(self, url: str) -> None:
    if self.selected_project_keys():
      return

    hint = infer_project_hint_from_url(url)
    if not hint:
      return

    try:
      body = await self._jira_get("/rest/api/3/project/search", {"maxResults": 50})
      projects = body.get("values", [])
      match = match_project_for_hint(projects, hint)
      if match and match.get("key"):
        data = load_connection(self.id) or {}
        data["selected_project_keys"] = [str(match["key"]).upper()]
        save_connection(self.id, data)
    except Exception:
      return

  def _default_jql(self) -> str:
    keys = self.selected_project_keys()
    if not keys:
      return "updated >= -14d ORDER BY updated DESC"
    if len(keys) == 1:
      return f"project = {keys[0]} AND updated >= -14d ORDER BY updated DESC"
    joined = ", ".join(keys)
    return f"project in ({joined}) AND updated >= -14d ORDER BY updated DESC"

  async def authenticate(self) -> bool:
    data = load_connection(self.id)
    if not data:
      return False
    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      return bool(data.get("pat_token") and data.get("account_email") and data.get("site_url"))
    if data.get("auth_method") == AuthMethod.OAUTH.value:
      if data.get("refresh_token") or data.get("access_token"):
        await self._ensure_fresh_oauth_token(data)
        return True
    return False

  async def test_connection(self) -> TestConnectionResult:
    data = load_connection(self.id)
    if not data:
      return TestConnectionResult(ok=False, message="Jira is not connected.")

    try:
      if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
        async with httpx.AsyncClient(timeout=30.0) as client:
          response = await client.get(
            f"{data['site_url']}/rest/api/3/myself",
            auth=(data["account_email"], data["pat_token"]),
            headers={"Accept": "application/json"},
          )
          response.raise_for_status()
          me = response.json()
        return TestConnectionResult(
          ok=True,
          message="Jira PAT connection is healthy.",
          details={"account": me.get("displayName"), "email": data.get("account_email")},
        )

      data = await self._ensure_fresh_oauth_token(data)
      cloud_id = data["cloud_id"]
      headers = {
        "Authorization": f"Bearer {data['access_token']}",
        "Accept": "application/json",
      }
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/myself",
          headers=headers,
        )
        response.raise_for_status()
        me = response.json()
      return TestConnectionResult(
        ok=True,
        message="Jira OAuth connection is healthy.",
        details={
          "account": me.get("displayName"),
          "email": data.get("account_email"),
          "site": data.get("site_url"),
        },
      )
    except Exception as exc:
      return TestConnectionResult(ok=False, message=str(exc))

  async def _ensure_fresh_oauth_token(self, data: dict[str, Any]) -> dict[str, Any]:
    expires_at = float(data.get("expires_at") or 0)
    if time.time() < expires_at and data.get("access_token"):
      return data

    refresh_token = data.get("refresh_token")
    if not refresh_token:
      raise ValueError("Jira access token expired and no refresh token is available. Reconnect.")

    oauth = get_jira_oauth_config()
    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.post(
        ATLASSIAN_TOKEN_URL,
        json={
          "grant_type": "refresh_token",
          "client_id": oauth["client_id"],
          "client_secret": oauth["client_secret"],
          "refresh_token": refresh_token,
        },
      )
      response.raise_for_status()
      tokens = response.json()

    data["access_token"] = tokens["access_token"]
    if tokens.get("refresh_token"):
      data["refresh_token"] = tokens["refresh_token"]
    data["expires_at"] = time.time() + int(tokens.get("expires_in", 3600)) - 60
    save_connection(self.id, data)
    return data

  async def _jira_get(self, path: str, params: dict[str, Any] | None = None) -> Any:
    if not await self.authenticate():
      raise ValueError("Jira is not connected.")

    data = load_connection(self.id)
    assert data is not None
    params = params or {}

    if data.get("auth_method") == AuthMethod.PERSONAL_ACCESS_TOKEN.value:
      async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
          f"{data['site_url']}{path}",
          auth=(data["account_email"], data["pat_token"]),
          headers={"Accept": "application/json"},
          params=params,
        )
        response.raise_for_status()
        return response.json()

    data = await self._ensure_fresh_oauth_token(data)
    headers = {
      "Authorization": f"Bearer {data['access_token']}",
      "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
      response = await client.get(
        f"https://api.atlassian.com/ex/jira/{data['cloud_id']}{path}",
        headers=headers,
        params=params,
      )
      response.raise_for_status()
      return response.json()

  async def get_projects(self) -> list[dict[str, Any]]:
    body = await self._jira_get("/rest/api/3/project/search", {"maxResults": 50})
    selected = set(self.selected_project_keys())
    return [
      {
        "id": project.get("id"),
        "key": project.get("key"),
        "name": project.get("name"),
        "projectTypeKey": project.get("projectTypeKey"),
        "selected": str(project.get("key") or "").upper() in selected,
      }
      for project in body.get("values", [])
    ]

  async def get_issues(
    self,
    *,
    jql: str | None = None,
    max_results: int = 50,
  ) -> list[dict[str, Any]]:
    query = jql or self._default_jql()
    body = await self._jira_get(
      "/rest/api/3/search",
      {
        "jql": query,
        "maxResults": max_results,
        "fields": "summary,status,assignee,updated,priority,issuetype,description,labels",
      },
    )
    issues = body.get("issues", [])
    normalized: list[dict[str, Any]] = []
    for issue in issues:
      fields = issue.get("fields") or {}
      assignee = fields.get("assignee") or {}
      status = fields.get("status") or {}
      priority = fields.get("priority") or {}
      issuetype = fields.get("issuetype") or {}
      description = fields.get("description")
      if isinstance(description, dict):
        description = _adf_to_text(description)
      normalized.append(
        {
          "id": issue.get("id"),
          "key": issue.get("key"),
          "summary": fields.get("summary"),
          "status": status.get("name"),
          "assignee": assignee.get("displayName") or assignee.get("emailAddress"),
          "updated": fields.get("updated"),
          "priority": priority.get("name"),
          "type": issuetype.get("name"),
          "labels": fields.get("labels") or [],
          "description": description,
          "url": issue.get("self"),
        }
      )
    return normalized

  async def get_sprints(self, *, max_results: int = 20) -> list[dict[str, Any]]:
    """Best-effort active/recent sprints via boards API."""
    try:
      boards = await self._jira_get(
        "/rest/agile/1.0/board",
        {"maxResults": 10},
      )
    except Exception:
      return []

    sprints: list[dict[str, Any]] = []
    for board in boards.get("values", [])[:5]:
      board_id = board.get("id")
      if not board_id:
        continue
      try:
        body = await self._jira_get(
          f"/rest/agile/1.0/board/{board_id}/sprint",
          {"state": "active,future", "maxResults": max_results},
        )
      except Exception:
        continue
      for sprint in body.get("values", []):
        sprints.append(
          {
            "id": sprint.get("id"),
            "name": sprint.get("name"),
            "state": sprint.get("state"),
            "startDate": sprint.get("startDate"),
            "endDate": sprint.get("endDate"),
            "board_id": board_id,
            "board_name": board.get("name"),
          }
        )
    return sprints


def _adf_to_text(node: Any) -> str:
  """Flatten Atlassian Document Format to plain text."""
  if node is None:
    return ""
  if isinstance(node, str):
    return node
  if isinstance(node, dict):
    if node.get("type") == "text":
      return str(node.get("text") or "")
    parts = [_adf_to_text(child) for child in node.get("content") or []]
    return " ".join(part for part in parts if part)
  if isinstance(node, list):
    return " ".join(_adf_to_text(item) for item in node)
  return ""
