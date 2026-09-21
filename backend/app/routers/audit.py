import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.base import get_db
from app.models.models import User, AuditLog
from app.core.dependencies import require_role

router = APIRouter(prefix="/audit-log", tags=["Auditoría Inmutable"])

@router.get("")
async def get_audit_log_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    operation_type: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)
    if operation_type:
        query = query.where(AuditLog.operation_type == operation_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    # Count query
    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar_one()

    # Paginated query
    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.timestamp_utc.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return {
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": (total_count + page_size - 1) // page_size if total_count > 0 else 0,
        "items": entries
    }
