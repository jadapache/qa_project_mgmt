import pytest
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import Base, User, Project, ChatSession, RagDocument
from app.services.rag_service import generate_rag_response

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.mark.asyncio
async def test_generate_rag_response_empty_and_populated():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        owner = User(username="owner_rag", password_hash="hash", role="Administrador")
        session.add(owner)
        await session.flush()

        project = Project(
            name="Project RAG",
            start_date=date.today(),
            end_date_estimated=date.today(),
            owner_id=owner.id
        )
        session.add(project)
        await session.flush()

        chat_session = ChatSession(project_id=project.id, user_id=owner.id)
        session.add(chat_session)
        await session.commit()

        # 1. Test when no indexed documents exist
        response_text, sources = await generate_rag_response(session, chat_session, "Consulta de prueba")
        assert "No se encontró información suficiente" in response_text
        assert sources == []

        # 2. Add an indexed document
        rag_doc = RagDocument(
            project_id=project.id,
            filename="especificacion.pdf",
            mime_type="application/pdf",
            size_bytes=1024,
            status="Indexado"
        )
        session.add(rag_doc)
        await session.commit()

        # Test when indexed documents exist
        response_text_2, sources_2 = await generate_rag_response(session, chat_session, "Criterios de prueba")
        assert "especificacion.pdf" in response_text_2
        assert len(sources_2) == 1
        assert sources_2[0]["filename"] == "especificacion.pdf"

    await engine.dispose()
