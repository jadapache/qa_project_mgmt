import io
import pytest
import openpyxl
from hypothesis import given, strategies as st
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.import_service import validate_and_import_xlsx

# Property 10: Importación XLSX — atomicidad (Req. 10.4, 10.5)
@pytest.mark.asyncio
async def test_property_10_import_atomicity_rejects_invalid_file(async_session: AsyncSession = None):
    # Generar un archivo XLSX donde la fila 2 es válida y la fila 3 es inválida (descripción vacía)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Descripción", "Criterios", "Prioridad"])
    ws.append(["Historia Valida 1", "Criterio A", "Alta"])
    ws.append(["", "Criterio B", "InvalidaPriority"]) # Fila inválida (descripción vacía + prioridad inválida)

    output = io.BytesIO()
    wb.save(output)
    file_bytes = output.getvalue()

    # Al ejecutar validate_and_import_xlsx, DEBE lanzar HTTPException 422 con reporte de errores
    with pytest.raises(HTTPException) as exc_info:
        await validate_and_import_xlsx(
            file_bytes=file_bytes,
            entity="stories",
            project_id="00000000-0000-0000-0000-000000000001",
            iteration_id="00000000-0000-0000-0000-000000000002",
            db=async_session
        )

    assert exc_info.value.status_code == 422
    detail = exc_info.value.detail
    assert "row_errors" in detail
    assert detail["total_errors"] > 0
