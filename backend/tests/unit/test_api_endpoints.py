import pytest
import uuid
from datetime import date
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Frame-Options"] == "DENY"

@pytest.mark.asyncio
async def test_auth_and_user_flows():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login exitoso como Admin por defecto
        login_res = await ac.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin12345!"})
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get current user profile (/users/me)
        me_res = await ac.get("/api/v1/users/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "admin"

        # 3. List users (/users)
        users_res = await ac.get("/api/v1/users", headers=headers)
        assert users_res.status_code == 200
        assert len(users_res.json()) >= 1

        # 4. Crear un nuevo proyecto (/projects)
        unique_prj_name = f"Proyecto Test {uuid.uuid4().hex[:6]}"
        prj_data = {
            "name": unique_prj_name,
            "description": "Proyecto para alcanzar cobertura alta",
            "start_date": str(date.today()),
            "end_date_estimated": str(date.today())
        }
        prj_res = await ac.post("/api/v1/projects", json=prj_data, headers=headers)
        assert prj_res.status_code == 201
        project_id = prj_res.json()["id"]

        # List projects
        list_prj_res = await ac.get("/api/v1/projects", headers=headers)
        assert list_prj_res.status_code == 200

        # Get project by id
        get_prj_res = await ac.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert get_prj_res.status_code == 200

        # 5. Crear una iteración/sprint (/projects/{id}/iterations)
        iter_data = {
            "name": "Sprint 1 Cobertura",
            "start_date": str(date.today()),
            "end_date": str(date.today())
        }
        iter_res = await ac.post(f"/api/v1/projects/{project_id}/iterations", json=iter_data, headers=headers)
        assert iter_res.status_code == 201
        iteration_id = iter_res.json()["id"]

        # List iterations
        list_iter_res = await ac.get(f"/api/v1/projects/{project_id}/iterations", headers=headers)
        assert list_iter_res.status_code == 200

        # 6. Crear una historia de usuario (/iterations/{id}/stories)
        story_data = {
            "description": "Historia de usuario de prueba para cobertura",
            "acceptance_criteria": "Dado que el sistema ejecuta los tests...",
            "priority": "Alta"
        }
        story_res = await ac.post(f"/api/v1/iterations/{iteration_id}/stories", json=story_data, headers=headers)
        assert story_res.status_code == 201
        story_id = story_res.json()["id"]

        # List stories
        list_stories_res = await ac.get(f"/api/v1/iterations/{iteration_id}/stories", headers=headers)
        assert list_stories_res.status_code == 200

        # 7. Ingesta - Listar documentos RAG (/projects/{project_id}/rag-documents)
        docs_res = await ac.get(f"/api/v1/projects/{project_id}/rag-documents", headers=headers)
        assert docs_res.status_code == 200

        # 8. Chat RAG (/projects/{project_id}/chat-sessions y /chat-sessions/{session_id}/messages)
        chat_sess_res = await ac.post(f"/api/v1/projects/{project_id}/chat-sessions", headers=headers)
        assert chat_sess_res.status_code == 200
        session_id = chat_sess_res.json()["id"]

        msg_res = await ac.post(
            f"/api/v1/chat-sessions/{session_id}/messages?content=ConsultaPrueba",
            headers=headers
        )
        assert msg_res.status_code == 200

        list_msgs_res = await ac.get(f"/api/v1/chat-sessions/{session_id}/messages", headers=headers)
        assert list_msgs_res.status_code == 200

        # 9. AI Drafts (/projects/{project_id}/ai-drafts)
        drafts_res = await ac.get(f"/api/v1/projects/{project_id}/ai-drafts", headers=headers)
        assert drafts_res.status_code == 200

        # 10. Documentos versionados (/doc-templates y /projects/{project_id}/documents)
        tpl_res = await ac.post(
            "/api/v1/doc-templates?name=PlantillaPrueba&description=Desc&content=ContenidoTexto",
            headers=headers
        )
        assert tpl_res.status_code == 201
        tpl_id = tpl_res.json()["id"]

        doc_templates_res = await ac.get("/api/v1/doc-templates", headers=headers)
        assert doc_templates_res.status_code == 200

        gen_doc_res = await ac.post(
            f"/api/v1/projects/{project_id}/documents?template_id={tpl_id}",
            headers=headers
        )
        assert gen_doc_res.status_code == 201
        doc_id = gen_doc_res.json()["id"]

        ver_docs_res = await ac.get(f"/api/v1/projects/{project_id}/documents", headers=headers)
        assert ver_docs_res.status_code == 200

        approve_doc_res = await ac.patch(f"/api/v1/documents/{doc_id}/approve", headers=headers)
        assert approve_doc_res.status_code == 200

        download_doc_res = await ac.get(f"/api/v1/documents/{doc_id}/download", headers=headers)
        assert download_doc_res.status_code == 200

        # Close chat session
        close_sess_res = await ac.patch(f"/api/v1/chat-sessions/{session_id}/close", headers=headers)
        assert close_sess_res.status_code == 200

        # 11. Exportar XLSX (/projects/{project_id}/export?entity=stories)
        export_res = await ac.get(f"/api/v1/projects/{project_id}/export?entity=stories", headers=headers)
        assert export_res.status_code == 200
        assert export_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        # 12. Logout (/auth/logout)
        logout_res = await ac.post("/api/v1/auth/logout", headers=headers)
        assert logout_res.status_code == 200
