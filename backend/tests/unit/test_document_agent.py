import pytest
from app.core.document_agent.schema import (
    CanonicalDocumentState,
    DocumentSection,
    InsertImageOperation,
    InsertTextOperation,
    TargetLocator,
    AssetLocator,
)
from app.core.document_agent.validator import DocumentOperationValidator


def test_validator_with_valid_section_and_image():
    state = CanonicalDocumentState(
        document_id="doc_123",
        title="Propuesta de Mejora",
        sections=[
            DocumentSection(id="sec_1", title="Necesidad Identificada", preview_text="..."),
            DocumentSection(id="sec_2", title="Observaciones Complementarias", preview_text="..."),
        ],
        tags_present=["NECESIDAD", "OBSERVACIONES"],
    )

    # Valid operation targeting "Observaciones"
    op = InsertImageOperation(
        target=TargetLocator(section_title="Observaciones", position="inside_end"),
        asset=AssetLocator(asset_id="img_01", url="http://localhost:8000/assets/img_01.png", caption="Pantalla de error"),
    )

    valid, msg = DocumentOperationValidator.validate(op, state, available_asset_ids=["img_01", "img_02"])
    assert valid is True
    assert "Matched section 'Observaciones Complementarias'" in msg


def test_validator_rejects_missing_target():
    state = CanonicalDocumentState(
        document_id="doc_123",
        title="Propuesta de Mejora",
        sections=[
            DocumentSection(id="sec_1", title="Necesidad", preview_text="..."),
        ],
        tags_present=["NECESIDAD"],
    )

    op = InsertImageOperation(
        target=TargetLocator(section_title="Seccion Inexistente", position="inside_end"),
        asset=AssetLocator(asset_id="img_01", url="http://localhost:8000/assets/img_01.png"),
    )

    valid, msg = DocumentOperationValidator.validate(op, state, available_asset_ids=["img_01"])
    assert valid is False
    assert "Target not found" in msg


def test_validator_matches_tag():
    state = CanonicalDocumentState(
        document_id="doc_123",
        title="Propuesta con Tags",
        tags_present=["IMPACTO", "OBSERVACIONES"],
    )

    op = InsertTextOperation(
        target=TargetLocator(tag="{{OBSERVACIONES}}", position="after"),
        content="Texto de prueba añadido a observaciones.",
    )

    valid, msg = DocumentOperationValidator.validate(op, state)
    assert valid is True
    assert "Matched document placeholder tag" in msg


def test_agentic_prompt_api_mandatory_scenario():
    from fastapi.testclient import TestClient
    from app.main import create_app

    client = TestClient(create_app())

    payload = {
        "prompt": "Me gustó la propuesta, incluye en las observaciones estas imágenes.",
        "document_state": {
            "document_id": "doc_test_99",
            "kind": "document",
            "title": "Propuesta de Mejora Funcional",
            "sections": [
                {"id": "sec_1", "title": "Necesidad", "level": 1, "paragraph_count": 2, "preview_text": "text", "tables": [], "images": []},
                {"id": "sec_2", "title": "Observaciones y Casos de Borde", "level": 1, "paragraph_count": 1, "preview_text": "text", "tables": [], "images": []},
            ],
            "tables_summary": [],
            "tags_present": ["OBSERVACIONES"],
            "total_paragraphs": 10,
            "total_images": 0,
            "version": 1,
        },
        "attached_asset_ids": ["img_error_login", "img_flujo_alterno"],
    }

    response = client.post("/api/doc-agent/agentic-prompt", json=payload)
    assert response.status_code == 200
    data = response.json()

    intent = data.get("intentDetected") or data.get("intent_detected")
    assert intent == "insert_asset_in_section"
    assert (data.get("requiresDocumentMutation") or data.get("requires_document_mutation")) is True
    ops = data.get("plannedOperations") or data.get("planned_operations")
    assert len(ops) == 2
    assert ops[0]["operation"] == "insert_image"


def test_agentic_prompt_api_camel_case_from_frontend():
    from fastapi.testclient import TestClient
    from app.main import create_app

    client = TestClient(create_app())

    # Exactly what browser sends:
    payload = {
        "prompt": "Me gustó la propuesta, incluye en las observaciones estas imágenes.",
        "documentState": {
            "documentId": "doc_test_100",
            "kind": "document",
            "title": "Propuesta de Mejora Funcional",
            "sections": [
                {"id": "sec_1", "title": "Necesidad", "level": 1, "paragraphCount": 2, "previewText": "text", "tables": [], "images": []},
                {"id": "sec_2", "title": "Observaciones y Casos de Borde", "level": 1, "paragraphCount": 1, "previewText": "text", "tables": [], "images": []},
            ],
            "tablesSummary": [],
            "tagsPresent": ["OBSERVACIONES"],
            "totalParagraphs": 10,
            "totalImages": 0,
            "version": 1,
        },
        "attachedAssetIds": ["img_error_login", "img_flujo_alterno"],
    }

    response = client.post("/api/doc-agent/agentic-prompt", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    intent = data.get("intentDetected") or data.get("intent_detected")
    assert intent == "insert_asset_in_section"
    ops = data.get("plannedOperations") or data.get("planned_operations")
    assert len(ops) == 2
