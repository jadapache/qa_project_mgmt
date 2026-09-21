import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "QA Project Mgmt"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = "change-this-secret-key-to-a-secure-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Database: Por defecto SQLite local (desarrollo sin Docker) o PostgreSQL
    DATABASE_URL: str = "sqlite+aiosqlite:///./qa_mgmt.db"
    SYNC_DATABASE_URL: str = "sqlite:///./qa_mgmt.db"

    # Redis: Por defecto memoria/fallback local si Redis no está disponible
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "tauri://localhost", "https://tauri.localhost"]

    # Jira Encryption (32 url-safe base64-encoded bytes)
    JIRA_ENCRYPTION_KEY: str = "make_a_fernet_key_here_32_bytes_base64_encoded="

    # RAG Motor Config (Soporte Gemini / Groq / DeepSeek / OpenRouter / OpenAI / Ollama / Local)
    LLM_PROVIDER: str = "gemini" # gemini / groq / deepseek / openrouter / openai / ollama / local
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    RAG_SIMILARITY_THRESHOLD: float = 0.75

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
