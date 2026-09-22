"""Central registry for integrations."""

from __future__ import annotations

from app.integrations.base import Integration, IntegrationInfo
from app.integrations.github.integration import GitHubIntegration
from app.integrations.gitlab.integration import GitLabIntegration
from app.integrations.jira.integration import JiraIntegration

GIT_HOSTING_IDS = frozenset({"github", "gitlab"})


class IntegrationRegistry:
  def __init__(self) -> None:
    self._integrations: dict[str, Integration] = {}
    self.register(JiraIntegration())
    self.register(GitHubIntegration())
    self.register(GitLabIntegration())

  def register(self, integration: Integration) -> None:
    self._integrations[integration.id] = integration

  def get(self, integration_id: str) -> Integration:
    if integration_id not in self._integrations:
      raise KeyError(f"Unknown integration: {integration_id}")
    return self._integrations[integration_id]

  def list(self) -> list[Integration]:
    return list(self._integrations.values())

  def list_info(self) -> list[IntegrationInfo]:
    return [item.get_info() for item in self.list()]


registry = IntegrationRegistry()
