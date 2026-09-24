import pytest
from app.db.database import init_db
from app.db.repositories import (
    UserRepository,
    SettingsRepository,
    ChatRepository,
    StandupRepository,
    PRDRepository,
    TestPlanRepository,
)


@pytest.mark.asyncio
async def test_user_repository_create_and_get():
    await init_db()
    repo = UserRepository()
    username = "test_user_unit"
    
    # Clean up if exists
    existing = await repo.get_by_username(username)
    if existing:
        await repo.delete(existing["id"])

    user = await repo.create_user(username=username, email="test@example.com", full_name="Test Unit User")
    assert user["username"] == username
    assert user["email"] == "test@example.com"
    assert user["role"] == "user"

    fetched = await repo.get_by_username(username)
    assert fetched is not None
    assert fetched["id"] == user["id"]

    # Cleanup
    await repo.delete(user["id"])


@pytest.mark.asyncio
async def test_settings_repository_set_and_get():
    await init_db()
    repo = SettingsRepository()
    key = "unit_test_key"
    val = {"enabled": True, "threshold": 42}

    await repo.set_setting(key, val)
    retrieved = await repo.get_setting(key)
    assert retrieved == val

    all_settings = await repo.get_all_settings()
    assert key in all_settings
    assert all_settings[key] == val


@pytest.mark.asyncio
async def test_chat_repository_save_and_retrieve():
    await init_db()
    repo = ChatRepository()
    session_id = "test_session_unit"

    msg = await repo.save_message(
        session_id=session_id,
        role="user",
        content="Hello world test",
        context_sources=[{"title": "Doc1"}]
    )
    assert msg["session_id"] == session_id
    assert msg["content"] == "Hello world test"

    history = await repo.get_session_messages(session_id)
    assert len(history) >= 1
    latest = history[-1]
    assert latest["content"] == "Hello world test"
    assert latest["context_sources"] == [{"title": "Doc1"}]

    cleared = await repo.clear_session(session_id)
    assert cleared is True
