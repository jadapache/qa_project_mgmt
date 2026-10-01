from __future__ import annotations

import logging
import os
import shutil
import subprocess
import time
import urllib.request
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

WHISPER_MODELS_METADATA = {
  "tiny": {
    "name": "Whisper Tiny",
    "size_label": "75 MB",
    "accuracy": "Básica (Rápido)",
    "description": "Ultra ligero, ideal para pruebas rápidas y máquinas con recursos limitados.",
  },
  "base": {
    "name": "Whisper Base",
    "size_label": "142 MB",
    "accuracy": "Estándar",
    "description": "Excelente balance entre velocidad y precisión para reuniones estándar.",
  },
  "small": {
    "name": "Whisper Small",
    "size_label": "466 MB",
    "accuracy": "Buena",
    "description": "Mayor precisión con acentos y términos técnicos en español.",
  },
  "medium": {
    "name": "Whisper Medium",
    "size_label": "1.5 GB",
    "accuracy": "Alta",
    "description": "Alta fidelidad en la transcripción, requiere GPU o CPU con buen rendimiento.",
  },
  "large-v3": {
    "name": "Whisper Large v3",
    "size_label": "3.1 GB",
    "accuracy": "Máxima",
    "description": "El modelo insignia con la mayor precisión multilingüe disponible.",
  },
  "large-v3-turbo": {
    "name": "Whisper Large v3 Turbo",
    "size_label": "1.6 GB",
    "accuracy": "Alta / Rápido",
    "description": "Versión optimizada de Large v3 con decodificación acelerada.",
  },
}


def get_whisper_cache_dir() -> Path:
  cache_dir = Path(os.path.expanduser("~")) / ".cache" / "whisper"
  cache_dir.mkdir(parents=True, exist_ok=True)
  return cache_dir


def get_local_models_info() -> List[Dict[str, Any]]:
  """Inspects the local cache directory to list all Whisper models and their download status."""
  cache_dir = get_whisper_cache_dir()
  results: List[Dict[str, Any]] = []

  for model_id, meta in WHISPER_MODELS_METADATA.items():
    model_file = cache_dir / f"{model_id}.pt"
    is_downloaded = model_file.exists() and model_file.stat().st_size > 1024 * 1024
    disk_size_mb = round(model_file.stat().st_size / (1024 * 1024), 1) if is_downloaded else 0.0

    results.append({
      "id": model_id,
      "name": meta["name"],
      "size": meta["size_label"],
      "accuracy": meta["accuracy"],
      "description": meta["description"],
      "is_downloaded": is_downloaded,
      "disk_size_mb": disk_size_mb,
      "file_path": str(model_file) if is_downloaded else None,
    })

  return results


def download_model_file(
  model_id: str,
  progress_callback: Optional[Callable[[int, int, float], None]] = None,
) -> Path:
  """Downloads a Whisper model file (.pt) to the local cache directory."""
  import whisper

  if model_id not in whisper._MODELS:
    raise ValueError(f"Modelo Whisper desconocido: {model_id}. Modelos disponibles: {list(whisper._MODELS.keys())}")

  url = whisper._MODELS[model_id]
  cache_dir = get_whisper_cache_dir()
  target_file = cache_dir / f"{model_id}.pt"
  tmp_file = cache_dir / f"{model_id}.pt.download"

  if target_file.exists() and target_file.stat().st_size > 1024 * 1024:
    logger.info(f"Whisper model {model_id} already exists at {target_file}")
    return target_file

  logger.info(f"Downloading Whisper model {model_id} from {url} to {target_file}")

  req = urllib.request.Request(url, headers={"User-Agent": "QA-Project-MGMT/1.0"})
  with urllib.request.urlopen(req) as response:
    total_size = int(response.headers.get("content-length", 0))
    downloaded = 0
    chunk_size = 1024 * 512  # 512 KB chunks

    with open(tmp_file, "wb") as f_out:
      while True:
        chunk = response.read(chunk_size)
        if not chunk:
          break
        f_out.write(chunk)
        downloaded += len(chunk)
        if total_size > 0 and progress_callback:
          progress_callback(downloaded, total_size, round((downloaded / total_size) * 100, 1))

  # Atomically replace
  if target_file.exists():
    target_file.unlink()
  tmp_file.rename(target_file)
  logger.info(f"Whisper model {model_id} downloaded successfully to {target_file}")
  return target_file


def delete_model_file(model_id: str) -> bool:
  """Deletes a downloaded Whisper model file from the cache directory."""
  cache_dir = get_whisper_cache_dir()
  target_file = cache_dir / f"{model_id}.pt"
  tmp_file = cache_dir / f"{model_id}.pt.download"

  deleted = False
  if target_file.exists():
    try:
      target_file.unlink()
      deleted = True
      logger.info(f"Deleted Whisper model file: {target_file}")
    except Exception as exc:
      logger.error(f"Error deleting model file {target_file}: {exc}")
      raise

  if tmp_file.exists():
    try:
      tmp_file.unlink()
    except Exception:
      pass

  return deleted


class ProgressInterceptorTqdm:
  """Intercepts tqdm updates from Whisper to provide real-time frame progress callbacks and cancellation checks."""

  def __init__(
    self,
    *args,
    on_progress: Optional[Callable[[int, str, str], None]] = None,
    cancel_check: Optional[Callable[[], bool]] = None,
    **kwargs,
  ):
    self.total = kwargs.get("total") or 1
    self.n = kwargs.get("initial", 0)
    self.on_progress = on_progress
    self.cancel_check = cancel_check
    self.start_time = time.time()
    self.last_emit_time = 0.0

  def update(self, n: int = 1):
    self.n += n
    if self.cancel_check and self.cancel_check():
      raise RuntimeError("Transcripción cancelada por el usuario.")

    now = time.time()
    # Throttle callbacks to at most once every 0.4s to avoid excessive events
    if (now - self.last_emit_time) >= 0.4 or self.n >= self.total:
      self.last_emit_time = now
      fraction = min(1.0, max(0.0, float(self.n) / float(self.total)))
      prog_pct = int(20 + fraction * 55)  # Range: 20% to 75%
      
      elapsed = now - self.start_time
      if fraction > 0:
        remaining = max(1.0, (elapsed / fraction) - elapsed)
        mins = int(remaining // 60)
        secs = int(remaining % 60)
        eta_str = f"~{mins} min {secs} s" if mins > 0 else f"~{secs} s"
      else:
        eta_str = "~30 s"

      pct_display = int(fraction * 100)
      message = f"Decodificando audio ({pct_display}% procesado)..."
      if self.on_progress:
        try:
          self.on_progress(prog_pct, message, eta_str)
        except Exception as exc:
          logger.debug(f"Progress callback error: {exc}")

  def close(self):
    pass

  def __enter__(self):
    return self

  def __exit__(self, *args):
    self.close()


class WhisperLocalService:
  def __init__(self, model_size: str = "base"):
    self.model_size = model_size
    self._model = None

  def _get_model(self):
    if self._model is None:
      try:
        import whisper
        logger.info(f"Loading local Whisper model: {self.model_size}")
        self._model = whisper.load_model(self.model_size)
      except ImportError:
        raise RuntimeError(
          "El paquete 'openai-whisper' no está instalado en el entorno local de Python. "
          "Para utilizar transcripción local, instala 'openai-whisper' y 'ffmpeg', o usa el modo Cloud (Groq / OpenAI)."
        )
      except Exception as exc:
        raise RuntimeError(f"Error al cargar el modelo local Whisper ({self.model_size}): {exc}") from exc
    return self._model

  def is_available(self) -> bool:
    try:
      import whisper  # noqa: F401
      return True
    except ImportError:
      return False

  def transcribe(
    self,
    audio_path: Path,
    language: Optional[str] = None,
    task: str = "transcribe",
    on_progress: Optional[Callable[[int, str, str], None]] = None,
    cancel_check: Optional[Callable[[], bool]] = None,
  ) -> Dict[str, Any]:
    import tqdm
    model = self._get_model()
    audio_file = str(audio_path)

    options: Dict[str, Any] = {"task": task, "verbose": False}
    if language:
      options["language"] = language

    # Intercept tqdm within whisper to stream real-time progression and check cancellation
    orig_tqdm = tqdm.tqdm

    def custom_tqdm_factory(*args, **kwargs):
      return ProgressInterceptorTqdm(
        *args,
        on_progress=on_progress,
        cancel_check=cancel_check,
        **kwargs,
      )

    tqdm.tqdm = custom_tqdm_factory
    try:
      result = model.transcribe(audio_file, **options)
    except Exception as exc:
      if "cancelada por el usuario" in str(exc).lower():
        raise
      raise RuntimeError(f"Error durante la transcripción local con Whisper: {exc}") from exc
    finally:
      tqdm.tqdm = orig_tqdm

    detected_lang = result.get("language", language or "es")
    raw_segments = result.get("segments", [])
    formatted_segments: List[Dict[str, Any]] = []

    for idx, seg in enumerate(raw_segments):
      formatted_segments.append({
        "start": float(seg.get("start", 0.0)),
        "end": float(seg.get("end", 0.0)),
        "text": seg.get("text", "").strip(),
        "speaker": f"Participante {(idx % 2) + 1}",
      })

    full_text = result.get("text", "").strip()

    return {
      "language": detected_lang,
      "text": full_text,
      "segments": formatted_segments,
      "duration": formatted_segments[-1]["end"] if formatted_segments else 0.0,
    }


def extract_audio_track(media_path: Path, output_wav_path: Path) -> Path:
  """Extract audio from video or convert audio format to 16kHz WAV if ffmpeg is present."""
  ffmpeg_cmd = shutil.which("ffmpeg")
  if not ffmpeg_cmd:
    return media_path

  try:
    cmd = [
      ffmpeg_cmd,
      "-y",
      "-i", str(media_path),
      "-vn",
      "-acodec", "pcm_s16le",
      "-ar", "16000",
      "-ac", "1",
      str(output_wav_path),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if output_wav_path.exists() and output_wav_path.stat().st_size > 0:
      return output_wav_path
  except Exception as e:
    logger.warning(f"FFmpeg conversion failed: {e}, using original media file.")

  return media_path
