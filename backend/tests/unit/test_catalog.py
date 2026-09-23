import pytest
from unittest.mock import patch
from app.ai import catalog
from app.ai.catalog import get_model_catalog, AIModelInfo


def test_no_fallback_catalog_hardcoded():
  """Verify that hardcoded fallback catalog has been eliminated."""
  assert not hasattr(catalog, "FALLBACK_CATALOG")


@pytest.mark.asyncio
async def test_catalog_retrieval_and_task_types():
  res = await get_model_catalog(refresh=False)
  assert len(res.models) > 0
  assert res.source in {"local_cache", "models.dev (en vivo)", "openrouter.ai (en vivo)"}

  # Verify task categorization
  chat_models = [m for m in res.models if m.task_type == "chat_writing"]
  voice_models = [m for m in res.models if m.task_type == "transcription"]

  assert len(chat_models) > 0
  assert len(voice_models) > 0

  # Check text models have proper task label
  for m in chat_models:
    assert m.task_label == "Redacción y Chat"
    assert "whisper" not in m.id.lower()

  # Check voice models are Whisper
  for m in voice_models:
    assert m.task_label == "Transcripción y Voz"
    assert "whisper" in m.id.lower()


@pytest.mark.asyncio
async def test_catalog_filter_by_task_type():
  # Filter chat_writing
  chat_catalog = await get_model_catalog(task_type="chat_writing")
  assert all(m.task_type == "chat_writing" for m in chat_catalog.models)
  assert all("whisper" not in m.id.lower() for m in chat_catalog.models)

  # Filter transcription
  voice_catalog = await get_model_catalog(task_type="transcription")
  assert len(voice_catalog.models) >= 2
  assert all(m.task_type == "transcription" for m in voice_catalog.models)
  assert all("whisper" in m.id.lower() for m in voice_catalog.models)


@pytest.mark.asyncio
async def test_catalog_offline_error_handling():
  """When external sources fail and no cache exists, return exact error message."""
  with patch("app.ai.catalog._fetch_from_models_dev", side_effect=Exception("Network error")), \
       patch("app.ai.catalog._fetch_from_openrouter", side_effect=Exception("Network error")), \
       patch("app.ai.catalog._load_cache", return_value=(None, 0)):
    res = await get_model_catalog(refresh=True)
    assert res.error == "Error de conexión, no se pudo obtener los modelos"
    assert len(res.models) == 0


@pytest.mark.asyncio
async def test_catalog_no_image_models_in_chat_writing():
  """Verify that image generation models like Nano Banana or Imagen are strictly excluded."""
  chat_catalog = await get_model_catalog(task_type="chat_writing")
  for m in chat_catalog.models:
    text = f"{m.id} {m.name} {m.description}".lower()
    assert "banana" not in text
    assert "imagen" not in text
    assert "dall-e" not in text


