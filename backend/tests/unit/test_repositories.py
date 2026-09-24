import pytest
from app.db.database import init_db
from app.db.repositories import (
    UserRepository,
    SettingsRepository,
    ChatRepository,
)
from app.schemas.user import UserCreate


@pytest.mark.asyncio
async def test_user_repository_create_and_get():
    await init_db()
    repo = UserRepository()
    username = "test_user_unit"

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

    await repo.delete(user["id"])


@pytest.mark.asyncio
async def test_repository_generic_methods():
    await init_db()
    repo = UserRepository()

    u1 = await repo.create(UserCreate(username="user_gen_1", email="u1@test.com", role="user"))
    u2 = await repo.create(UserCreate(username="user_gen_2", email="u2@test.com", role="user"))

    total = await repo.count()
    assert total >= 2

    found = await repo.find_one(username="user_gen_1")
    assert found is not None
    assert found.username == "user_gen_1"

    many = await repo.find_many(role="user")
    assert len(many) >= 2

    # Bulk update
    u1_id = u1.id if hasattr(u1, "id") else u1["id"]
    u2_id = u2.id if hasattr(u2, "id") else u2["id"]

    updated = await repo.update_bulk([u1_id, u2_id], {"status": "approved"})
    assert len(updated) == 2

    # Bulk delete
    deleted = await repo.delete_bulk([u1_id, u2_id])
    assert deleted is True


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
        context_sources=[{"title": "Doc1"}],
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
