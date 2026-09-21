import uuid
import base64
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from cryptography.fernet import Fernet
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Defect
from app.core.config import settings

# En memoria fallback de credenciales Jira por proyecto
_in_memory_jira_configs: Dict[str, Dict[str, str]] = {}

def _get_fernet_key() -> bytes:
    # Garantizar clave válida Fernet de 32 bytes en base64
    key_bytes = settings.SECRET_KEY.encode('utf-8')[:32].ljust(32, b'0')
    return base64.urlsafe_b64encode(key_bytes)

def encrypt_token(token: str) -> str:
    f = Fernet(_get_fernet_key())
    return f.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    f = Fernet(_get_fernet_key())
    return f.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')

def set_jira_config(project_id: str, jira_url: str, user_email: str, api_token: str) -> Dict[str, str]:
    enc_token = encrypt_token(api_token)
    _in_memory_jira_configs[project_id] = {
        "jira_url": jira_url.rstrip("/"),
        "user_email": user_email,
        "encrypted_token": enc_token
    }
    return {
        "project_id": project_id,
        "jira_url": jira_url.rstrip("/"),
        "user_email": user_email,
        "status": "Configurado_Cifrado"
    }

async def sync_defect_to_jira(db: AsyncSession, defect_id: uuid.UUID) -> Dict[str, Any]:
    defect = (await db.execute(select(Defect).where(Defect.id == defect_id))).scalars().first()
    if not defect:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Defecto no encontrado.")

    # Generar Jira Issue Key simulado o llamar REST API Jira
    jira_key = f"JIRA-{defect.id.hex[:4].upper()}"
    defect.jira_issue_key = jira_key
    defect.jira_synced_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(defect)

    return {
        "defect_id": str(defect.id),
        "jira_issue_key": jira_key,
        "synced_at": defect.jira_synced_at.isoformat(),
        "status": "Sincronizado"
    }
