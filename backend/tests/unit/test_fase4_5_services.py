import pytest
import uuid
import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.models import (
    Base, User, Project, Iteration, UserStory, TestCase, 
    Execution, Defect, QasCycle, Certification, 
    UatSession, UatTester, UatResult
)
from app.services.qa_service import (
    create_test_case_record, record_execution, create_defect_record, 
    add_evidence_record
)
from app.services.qas_service import (
    generate_qas_certification, compute_qas_metrics
)
from app.services.jira_service import (
    set_jira_config, encrypt_token, decrypt_token, sync_defect_to_jira
)
from app.services.uat_service import (
    create_uat_session_record, add_uat_tester_invitation, 
    record_uat_vote, get_uat_session_summary_metrics
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

async def get_test_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return engine, async_session

@pytest.mark.asyncio
async def test_qa_service_workflow():
    engine, async_session = await get_test_db()
    async with async_session() as db_session:
        user = User(username="analyst1", password_hash="hash", role="Analista_QA")
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        today = datetime.date.today()
        project = Project(name="Project QA", start_date=today, end_date_estimated=today, owner_id=user.id)
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        iteration = Iteration(
            project_id=project.id, name="Sprint 1", 
            start_date=today, end_date=today
        )
        db_session.add(iteration)
        await db_session.commit()
        await db_session.refresh(iteration)

        story = UserStory(iteration_id=iteration.id, description="US-1 Login")
        db_session.add(story)
        await db_session.commit()
        await db_session.refresh(story)

        # 1. Create TestCase
        tc = await create_test_case_record(
            db=db_session,
            story_id=story.id,
            title="Validar login exitoso",
            preconditions="Usuario activo",
            input_data="admin/admin",
            expected_result="Acceso concedido"
        )
        assert tc.id is not None
        assert tc.title == "Validar login exitoso"

        # 2. Execute TestCase
        exec_record = await record_execution(
            db=db_session,
            test_case_id=tc.id,
            analyst_id=user.id,
            result_status="Fallido",
            comments="Error 500 al enviar form"
        )
        assert exec_record.id is not None
        assert exec_record.result == "Fallido"

        # 3. Add Evidence
        evidence = await add_evidence_record(
            db=db_session,
            execution_id=exec_record.id,
            file_path="uploads/evidences/screenshot.png",
            mime_type="image/png",
            size_bytes=1024
        )
        assert evidence.id is not None
        assert evidence.file_path == "uploads/evidences/screenshot.png"

        # 4. Create Defect
        defect = await create_defect_record(
            db=db_session,
            execution_id=exec_record.id,
            title="Error 500 en login",
            severity="Alta",
            description="Stacktrace en login",
            steps_to_reproduce="1. Ir a login 2. Submit"
        )
        assert defect.id is not None
        assert defect.severity == "Alta"

    await engine.dispose()


@pytest.mark.asyncio
async def test_qas_service_workflow():
    engine, async_session = await get_test_db()
    async with async_session() as db_session:
        user = User(username="leader1", password_hash="hash", role="Líder_QA")
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        today = datetime.date.today()
        project = Project(name="Project QaS", start_date=today, end_date_estimated=today, owner_id=user.id)
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        cycle = QasCycle(
            project_id=project.id,
            name="Ciclo 1",
            start_date=today,
            end_date=today
        )
        db_session.add(cycle)
        await db_session.commit()
        await db_session.refresh(cycle)

        # Generate Certification v1
        cert1 = await generate_qas_certification(db_session, cycle.id, user_id=user.id)
        assert cert1.version == 1

        # Generate Certification v2
        cert2 = await generate_qas_certification(db_session, cycle.id, user_id=user.id)
        assert cert2.version == 2

        # Check metrics math
        cov, app = compute_qas_metrics(10, 8, 6)
        assert cov == 80.0
        assert app == 75.0

    await engine.dispose()


@pytest.mark.asyncio
async def test_jira_service_workflow():
    engine, async_session = await get_test_db()
    async with async_session() as db_session:
        user = User(username="admin1", password_hash="hash", role="Administrador")
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        today = datetime.date.today()
        project = Project(name="Project Jira", start_date=today, end_date_estimated=today, owner_id=user.id)
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        token = "secret_api_token"
        enc = encrypt_token(token)
        assert decrypt_token(enc) == token

        config = set_jira_config(str(project.id), "https://test.atlassian.net", "user@jira.com", token)
        assert config["status"] == "Configurado_Cifrado"

        iteration = Iteration(project_id=project.id, name="Sprint 1", start_date=today, end_date=today)
        db_session.add(iteration)
        await db_session.commit()

        story = UserStory(iteration_id=iteration.id, description="US-1")
        db_session.add(story)
        await db_session.commit()

        tc = TestCase(story_id=story.id, title="TC-1")
        db_session.add(tc)
        await db_session.commit()

        execution = Execution(test_case_id=tc.id, analyst_id=user.id, result="Fallido")
        db_session.add(execution)
        await db_session.commit()

        defect = Defect(execution_id=execution.id, title="Bug Jira", severity="Alta")
        db_session.add(defect)
        await db_session.commit()

        sync_res = await sync_defect_to_jira(db_session, defect.id)
        assert sync_res["jira_issue_key"].startswith("JIRA-")

    await engine.dispose()


@pytest.mark.asyncio
async def test_uat_service_workflow():
    engine, async_session = await get_test_db()
    async with async_session() as db_session:
        user_lead = User(username="lead_uat", password_hash="hash", role="Líder_QA")
        user_tester1 = User(username="tester1", password_hash="hash", role="UAT_Tester")
        user_tester2 = User(username="tester2", password_hash="hash", role="UAT_Tester")
        db_session.add_all([user_lead, user_tester1, user_tester2])
        await db_session.commit()

        today = datetime.date.today()
        project = Project(name="Project UAT", start_date=today, end_date_estimated=today, owner_id=user_lead.id)
        db_session.add(project)
        await db_session.commit()

        # Create UAT session
        session = await create_uat_session_record(
            db=db_session,
            project_id=project.id,
            owner_id=user_lead.id,
            name="Sesión UAT Fin de Año",
            start_date=today,
            end_date=today,
            description="Prueba UAT de módulo financiero"
        )
        assert session.id is not None

        # Invite testers
        inv1 = await add_uat_tester_invitation(db_session, session.id, user_tester1.id)
        inv2 = await add_uat_tester_invitation(db_session, session.id, user_tester2.id)
        assert inv1.session_id == session.id
        assert inv2.session_id == session.id

        # Record vote
        res1 = await record_uat_vote(db_session, session.id, user_tester1.id, "Aprobado", "Todo excelente")
        assert res1.result == "Aprobado"

        # Summary
        summary = await get_uat_session_summary_metrics(db_session, session.id)
        assert summary["total_invited_testers"] == 2
        assert summary["voted_testers_count"] == 1
        assert summary["approved_votes"] == 1
        assert summary["rejected_votes"] == 0
        assert summary["participation_pct"] == 50.0
        assert summary["approval_pct"] == 100.0

    await engine.dispose()
