import pytest
from hypothesis import given, strategies as st
from app.models.models import ChatMessage

# Property 11: Motor RAG — preservación de fuentes por respuesta (Req. 7.3)
@given(
    filename=st.text(min_size=3, max_size=30).map(lambda s: s + ".pdf"),
    fragment_ref=st.text(min_size=3, max_size=20)
)
def test_property_11_rag_sources_preservation(filename: str, fragment_ref: str):
    sources = [{
        "filename": filename,
        "fragment_id": fragment_ref,
        "page_or_section": "Pág 1"
    }]
    
    msg = ChatMessage(
        role="assistant",
        content="Respuesta basada en la documentación",
        rag_sources=sources
    )
    
    assert msg.rag_sources is not None
    assert len(msg.rag_sources) >= 1
    assert msg.rag_sources[0]["filename"] == filename
    assert msg.rag_sources[0]["fragment_id"] == fragment_ref
