from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: Optional[str] = ""
    full_name: Optional[str] = ""
    role: str = "user"
    status: str = "pending"


class UserCreate(UserBase):
    password_hash: Optional[str] = None
    password_salt: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password_hash: Optional[str] = None
    password_salt: Optional[str] = None


class UserInDB(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    password_hash: Optional[str] = None
    password_salt: Optional[str] = None
    created_at: Optional[datetime | str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: Optional[datetime | str] = None
