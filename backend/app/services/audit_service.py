import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import AuditLog

async def log_event(
    db: AsyncSession,
    operation_type: str,
    user_id: Optional[uuid.UUID] = None,
    user_role: Optional[str] = None,
    entity_id: Optional[uuid.UUID] = None,
    entity_type: Optional[str] = None,
    client_ip: Optional[str] = None,
    result: str = "Éxito",
    metadata: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Registra de forma inmutable una operación crítica en audit_log (Req. 11.1, 11.2, 11.3).
    """
    audit_entry = AuditLog(
        user_id=user_id,
        user_role=user_role,
        operation_type=operation_type,
        entity_id=entity_id,
        entity_type=entity_type,
        client_ip=client_ip,
        timestamp_utc=datetime.now(timezone.utc),
        result=result,
        metadata_json=metadata
    )
    db.add(audit_entry)
    await db.commit()
    return audit_entry
