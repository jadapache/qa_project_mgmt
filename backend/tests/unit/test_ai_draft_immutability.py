import pytest
from hypothesis import given, strategies as st
from app.models.models import AiDraft

# Property 12: Trazabilidad de borradores IA — preservación del contenido original (Req. 8.3)
@given(
    original_text=st.text(min_size=1, max_size=100),
    edits=st.lists(st.text(min_size=1, max_size=100), min_size=1, max_size=10)
)
def test_property_12_ai_draft_original_content_immutability(original_text: str, edits: list[str]):
    draft = AiDraft(
        artifact_type="Caso_Prueba",
        original_content=original_text,
        status="Borrador_IA"
    )
    
    # Aplicar N ediciones sobre edited_content
    for new_text in edits:
        draft.edited_content = new_text
        # El contenido original NUNCA cambia
        assert draft.original_content == original_text
        assert draft.edited_content == new_text
