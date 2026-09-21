import pytest
from hypothesis import given, strategies as st
from fastapi import HTTPException
from app.services.ingest_service import validate_ingest_file

# Property 9: Validación de tipo MIME y tamaño de archivos (Req. 4.7, 4.8, 9.2, 9.3)
@given(
    filename=st.text(min_size=1, max_size=50).map(lambda s: s + ".invalid"),
    mime_type=st.sampled_from(["application/exe", "video/mp4", "audio/mp3", "application/x-msdownload"]),
    size_bytes=st.integers(min_value=50000001, max_value=100000000) # Excede 50 MB
)
def test_property_9_file_validation_rejects_invalid_mime_and_size(filename: str, mime_type: str, size_bytes: int):
    # Archivo con MIME inválido y tamaño > 50 MB debe ser rechazado con HTTP 422
    with pytest.raises(HTTPException) as exc_info:
        validate_ingest_file(filename, mime_type, size_bytes)
        
    assert exc_info.value.status_code == 422
    detail_lower = exc_info.value.detail.lower()
    assert "supera" in detail_lower or "límite" in detail_lower or "mime" in detail_lower or "formato" in detail_lower
