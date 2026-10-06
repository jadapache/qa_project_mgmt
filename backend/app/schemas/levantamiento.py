from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class StoryProposalBase(BaseModel):
    title: str = Field(..., description="Título representativo de la historia de usuario")
    description: str = Field(..., description="Descripción en formato Como/Quiero/Para")
    acceptance_criteria: Optional[str] = Field(None, description="Criterios de aceptación en formato Gherkin/BDD o viñetas")
    priority: str = Field("MEDIA", description="Prioridad: ALTA, MEDIA, BAJA")


class StoryProposalCreate(StoryProposalBase):
    pass


class StoryProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class StoryProposalResponse(StoryProposalBase):
    id: str
    session_id: str
    status: str
    imported_story_id: Optional[str] = None
    created_at: str


class LevantamientoSessionCreate(BaseModel):
    project_id: str = "default"
    source_label: Optional[str] = "Transcripción Local STT"
    transcript: str = Field(..., min_length=10, description="Transcripción completa procesada en el cliente Tauri")
    llm_model: Optional[str] = "default"


class LevantamientoSessionResponse(BaseModel):
    id: str
    project_id: str
    created_by: Optional[str] = None
    status: str
    source_label: Optional[str] = None
    transcript: str
    summary_optional: Optional[str] = None
    llm_model: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
    proposals: List[StoryProposalResponse] = []


class ImportProposalsRequest(BaseModel):
    iteration_id: str = Field(..., description="ID de la iteración/sprint destino")
    proposal_ids: List[str] = Field(..., min_items=1, description="Lista de IDs de propuestas a importar como User Stories")
