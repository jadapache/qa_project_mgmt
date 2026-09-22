from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.context.knowledge import delete_document, ingest_document, list_documents
from app.context.service import assemble_context

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class RetrieveRequest(BaseModel):
  query: str = Field(min_length=1)
  sources: list[str] = Field(default_factory=lambda: ["knowledge"])
  top_k: int = 8


@router.get("/documents")
async def get_documents() -> dict[str, Any]:
  return {"documents": list_documents()}


@router.post("/documents")
async def upload_document(
  file: UploadFile = File(...),
  tags: str = Form(default=""),
) -> dict[str, Any]:
  raw = await file.read()
  if not raw:
    raise HTTPException(status_code=400, detail="Empty file")
  tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
  try:
    entry = ingest_document(filename=file.filename or "upload.txt", raw=raw, tags=tag_list)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  return {"document": entry}


@router.post("/documents/batch")
async def upload_documents_batch(
  files: list[UploadFile] = File(...),
  tags: str = Form(default=""),
) -> dict[str, Any]:
  if not files:
    raise HTTPException(status_code=400, detail="At least one file is required.")
  tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
  uploaded: list[dict[str, Any]] = []
  errors: list[str] = []
  for file in files:
    raw = await file.read()
    if not raw:
      errors.append(f"{file.filename or 'file'}: empty")
      continue
    try:
      entry = ingest_document(filename=file.filename or "upload.txt", raw=raw, tags=tag_list)
      uploaded.append(entry)
    except ValueError as exc:
      errors.append(f"{file.filename or 'file'}: {exc}")
  if not uploaded:
    raise HTTPException(status_code=400, detail="; ".join(errors) or "Upload failed")
  return {"documents": uploaded, "errors": errors}


@router.delete("/documents/{document_id}")
async def remove_document(document_id: str) -> dict[str, Any]:
  ok = delete_document(document_id)
  if not ok:
    raise HTTPException(status_code=404, detail="Document not found")
  return {"ok": True}


@router.post("/retrieve")
async def retrieve(body: RetrieveRequest) -> dict[str, Any]:
  bundle = await assemble_context(query=body.query, sources=body.sources, top_k=body.top_k)
  return bundle.model_dump()
