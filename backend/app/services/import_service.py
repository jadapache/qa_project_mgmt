import io
import uuid
from typing import Dict, Any, List, Tuple
import openpyxl
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import UserStory, TestCase

async def validate_and_import_xlsx(
    file_bytes: bytes,
    entity: str,
    project_id: str,
    iteration_id: str,
    db: AsyncSession
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Importación atómica de archivos XLSX (Req. 10.3, 10.4, 10.5, Propiedad 10).
    Si cualquier fila es inválida, rechaza la importación completa con HTTP 422.
    """
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        ws = wb.active
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"El archivo cargado no es una hoja de cálculo XLSX válida: {str(e)}"
        )

    rows = list(ws.iter_rows(values_only=True))
    if not rows or len(rows) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El archivo XLSX está vacío o no contiene filas de datos."
        )

    errors = []
    items_to_create = []

    if entity == "stories":
        # Encabezados esperados: Descripción, Criterios Aceptación, Prioridad
        for row_idx, row in enumerate(rows[1:], start=2):
            if not row or all(v is None for v in row):
                continue

            desc = str(row[0]).strip() if len(row) > 0 and row[0] is not None else ""
            criteria = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
            priority = str(row[2]).strip() if len(row) > 2 and row[2] is not None else "Media"

            row_errors = []
            if not desc:
                row_errors.append("Columna 'Descripción' es obligatoria.")
            elif len(desc) > 1000:
                row_errors.append("Columna 'Descripción' supera los 1000 caracteres.")

            if len(criteria) > 2000:
                row_errors.append("Columna 'Criterios Aceptación' supera los 2000 caracteres.")

            if priority not in ["Alta", "Media", "Baja"]:
                row_errors.append("Columna 'Prioridad' debe ser Alta, Media o Baja.")

            if row_errors:
                errors.append({"row": row_idx, "errors": row_errors})
            else:
                target_uuid = uuid.UUID(str(iteration_id)) if isinstance(iteration_id, str) else iteration_id
                items_to_create.append({
                    "iteration_id": target_uuid,
                    "description": desc,
                    "acceptance_criteria": criteria,
                    "priority": priority,
                    "status": "Pendiente"
                })

    elif entity == "test_cases":
        # Encabezados esperados: Título, Precondiciones, Datos Entrada, Resultado Esperado
        for row_idx, row in enumerate(rows[1:], start=2):
            if not row or all(v is None for v in row):
                continue

            title = str(row[0]).strip() if len(row) > 0 and row[0] is not None else ""
            precond = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
            input_d = str(row[2]).strip() if len(row) > 2 and row[2] is not None else ""
            exp_res = str(row[3]).strip() if len(row) > 3 and row[3] is not None else ""

            row_errors = []
            if not title:
                row_errors.append("Columna 'Título' es obligatoria.")
            elif len(title) > 255:
                row_errors.append("Columna 'Título' supera los 255 caracteres.")

            if row_errors:
                errors.append({"row": row_idx, "errors": row_errors})
            else:
                target_uuid = uuid.UUID(str(iteration_id)) if isinstance(iteration_id, str) else iteration_id
                items_to_create.append({
                    "story_id": target_uuid, # story_id
                    "title": title,
                    "preconditions": precond,
                    "input_data": input_d,
                    "expected_result": exp_res,
                    "steps": [],
                    "status": "Borrador"
                })
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Entidad de importación '{entity}' no soportada."
        )

    # Si hay errores en cualquier fila: RECHAZAR importación completa (Propiedad 10)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Se encontraron errores de validación en la estructura del archivo XLSX.",
                "total_errors": len(errors),
                "row_errors": errors
            }
        )

    # Persistir todos los registros en transacción atómica (Req. 10.5)
    async with db.begin_nested():
        if entity == "stories":
            for data in items_to_create:
                db.add(UserStory(**data))
        elif entity == "test_cases":
            for data in items_to_create:
                db.add(TestCase(**data))

    await db.commit()
    return len(items_to_create), errors
