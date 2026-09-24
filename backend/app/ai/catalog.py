"""AI Model Catalog Service.

Loads model metadata (rate limits, pricing, context windows, and tasks)
directly from declarative JSON catalog (models_catalog.json).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.core.settings import LOCAL_DIR
from app.models import AIModelInfo, ModelCatalogResponse

logger = logging.getLogger(__name__)

CATALOG_FILE = LOCAL_DIR / "ai" / "models_catalog.json"


def load_local_catalog() -> list[AIModelInfo]:
  """Load verified model list from local/ai/models_catalog.json file."""
  if not CATALOG_FILE.exists():
    logger.error(f"Catalog file not found at {CATALOG_FILE}")
    return []

  try:
    with open(CATALOG_FILE, "r", encoding="utf-8") as f:
      data = json.load(f)

    return [AIModelInfo(**item) for item in data]
  except Exception as e:
    logger.error(f"Failed to load AI models catalog from {CATALOG_FILE}: {e}")
    return []


async def get_model_catalog(
  refresh: bool = False,
  provider: str = "all",
  task_type: str = "all",
) -> ModelCatalogResponse:
  """Retrieve catalog of AI models from the declarative JSON registry."""
  models = load_local_catalog()

  source = "local_json"
  error_msg = None

  if not models:
    error_msg = "Error de conexión, no se pudo obtener los modelos"
    source = "error"

  # Filter by provider
  if provider and provider != "all":
    prov_key = provider.lower()
    models = [m for m in models if m.provider.lower() == prov_key]

  # Filter by task_type (chat_writing vs transcription)
  if task_type and task_type != "all":
    task_key = task_type.lower()
    models = [m for m in models if m.task_type.lower() == task_key]

  all_providers = sorted(list(set(m.provider for m in models))) if models else []

  return ModelCatalogResponse(
    updated_at=datetime.now(timezone.utc).isoformat(),
    source=source,
    providers=all_providers,
    models=models,
    error=error_msg,
  )
