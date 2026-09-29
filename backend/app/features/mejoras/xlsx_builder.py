"""Builder para exportación de matrices QA a formato Excel (.xlsx)."""

from __future__ import annotations

import io
from typing import Any

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

PRIMARY_HEX = "1E3A8A"
ALT_ROW_HEX = "F0F4FF"
HEADER_FONT_COLOR = "FFFFFF"


def create_qa_matrix_xlsx(
    title: str = "Matriz de Pruebas QA",
    rows: list[dict[str, Any]] | None = None,
) -> bytes:
    """Construye un archivo .xlsx con la matriz de pruebas QA.

    Args:
        title: Título de la hoja y del documento.
        rows: Lista de dicts con los datos de cada caso de prueba.

    Returns:
        Bytes del archivo .xlsx listo para descarga.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel limita a 31 caracteres el nombre de hoja

    headers = ["ID", "Módulo", "Caso de Prueba", "Precondiciones", "Pasos", "Resultado Esperado", "Prioridad", "Estado"]

    header_fill = PatternFill(start_color=PRIMARY_HEX, end_color=PRIMARY_HEX, fill_type="solid")
    header_font = Font(bold=True, color=HEADER_FONT_COLOR, name="Segoe UI", size=11)
    alt_fill = PatternFill(start_color=ALT_ROW_HEX, end_color=ALT_ROW_HEX, fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="top", wrap_text=True)
    thin_border = Border(
        left=Side(style="thin"),
        right=Side(style="thin"),
        top=Side(style="thin"),
        bottom=Side(style="thin"),
    )

    # Write headers
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border

    # Write data rows
    data_rows = rows or _default_qa_rows()
    for row_idx, row_data in enumerate(data_rows, start=2):
        fill = alt_fill if row_idx % 2 == 0 else PatternFill()
        for col_idx, key in enumerate(["id", "module", "test_case", "preconditions", "steps", "expected_result", "priority", "status"], start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=row_data.get(key, ""))
            cell.fill = fill
            cell.alignment = left_align if col_idx >= 3 else center_align
            cell.border = thin_border

    # Auto column widths
    col_widths = [8, 18, 35, 25, 40, 35, 12, 12]
    for col_idx, width in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    ws.row_dimensions[1].height = 28
    ws.freeze_panes = "A2"

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()


def _default_qa_rows() -> list[dict[str, Any]]:
    """Filas de ejemplo cuando no se proporcionan datos."""
    return [
        {
            "id": "TC-001",
            "module": "Autenticación",
            "test_case": "Login con credenciales válidas",
            "preconditions": "Usuario registrado y aprobado",
            "steps": "1. Ingresar usuario\n2. Ingresar contraseña\n3. Click en Ingresar",
            "expected_result": "Redirección al dashboard",
            "priority": "Alta",
            "status": "Pendiente",
        },
    ]

