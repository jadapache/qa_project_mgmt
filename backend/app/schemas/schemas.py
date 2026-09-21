import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = 28800 # 8h
    role: str
    username: str

class RegisterUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str
    role: str = Field(..., description="Administrador, Líder_QA, Analista_QA, UAT_Tester, Observador")

class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UpdateRoleRequest(BaseModel):
    role: str

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str


# --- Project Schemas ---
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    start_date: date
    end_date_estimated: date

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date_estimated: Optional[date] = None
    status: Optional[str] = None

class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    start_date: date
    end_date_estimated: date
    status: str
    owner_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Iteration Schemas ---
class IterationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: date

class IterationResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    status: str

    model_config = ConfigDict(from_attributes=True)


# --- User Story Schemas ---
class UserStoryCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=1000)
    acceptance_criteria: Optional[str] = Field(None, max_length=2000)
    priority: str = Field("Media", description="Alta, Media, Baja")

class UserStoryResponse(BaseModel):
    id: uuid.UUID
    iteration_id: uuid.UUID
    description: str
    acceptance_criteria: Optional[str]
    priority: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
