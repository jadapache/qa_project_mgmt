import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.models import User
from app.core.dependencies import require_role
from app.services.export_service import generate_xlsx
from app.services.import_service import validate_and_import_xlsx
from app.services.audit_service import log_event

router = APIRouter(prefix="/projects/{project_id}", tags=["Importación y Exportación"])

@router.get("/export")
async def export_data(
    project_id: uuid.UUID,
    entity: str = Query(..., description="test_cases | stories | defects"),
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    xlsx_stream = await generate_xlsx(str(project_id), entity, db)
    
    await log_event(
        db=db,
        operation_type="exportación_xlsx",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=project_id,
        entity_type="Project",
        result="Éxito",
        metadata={"entity": entity}
    )

    filename = f"export_{entity}_{project_id}.xlsx"
    return StreamingResponse(
        xlsx_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/import")
async def import_data(
    project_id: uuid.UUID,
    entity: str = Query(..., description="stories | test_cases"),
    target_id: uuid.UUID = Query(..., description="ID de la Iteración (para stories) o de la Historia (para test_cases)"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["Administrador", "Líder_QA"])),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se aceptan archivos con extensión .xlsx para la importación."
        )

    file_bytes = await file.read()
    imported_count, errors = await validate_and_import_xlsx(
        file_bytes=file_bytes,
        entity=entity,
        project_id=str(project_id),
        iteration_id=str(target_id),
        db=db
    )

    await log_event(
        db=db,
        operation_type="importación_xlsx",
        user_id=current_user.id,
        user_role=current_user.role,
        entity_id=project_id,
        entity_type="Project",
        result="Éxito",
        metadata={"entity": entity, "imported_records": imported_count}
    )

    return {
        "status": "success",
        "message": f"Se importaron {imported_count} registros exitosamente.",
        "imported_count": imported_count
    }
