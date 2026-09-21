import pytest
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import Base, AuditLog
from app.services.audit_service import log_event

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.mark.asyncio
async def test_audit_log_event():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        user_id = uuid.uuid4()
        entity_id = uuid.uuid4()
        
        entry = await log_event(
            db=session,
            operation_type="CAMBIO_ROL",
            user_id=user_id,
            user_role="Administrador",
            entity_id=entity_id,
            entity_type="User",
            client_ip="127.0.0.1",
            result="Éxito",
            metadata={"new_role": "Líder_QA"}
        )

        assert entry.id is not None
        assert entry.operation_type == "CAMBIO_ROL"
        assert entry.user_id == user_id
        assert entry.user_role == "Administrador"
        assert entry.entity_id == entity_id
        assert entry.entity_type == "User"
        assert entry.client_ip == "127.0.0.1"
        assert entry.result == "Éxito"
        assert entry.metadata_json == {"new_role": "Líder_QA"}

    await engine.dispose()
