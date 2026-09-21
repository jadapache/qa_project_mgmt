import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock
from app.core.security import (
    validate_password_policy,
    create_access_token,
    decode_access_token,
    revoke_token,
    is_token_revoked,
    revoke_all_user_tokens,
    is_user_token_invalidated_by_role_change,
    verify_password,
    _get_redis
)

def test_validate_password_policy():
    # Demasiado corta (< 10)
    valid, msg = validate_password_policy("Ab1!")
    assert valid is False
    assert "10 caracteres" in msg

    # Sin mayúscula
    valid, msg = validate_password_policy("lowercase123")
    assert valid is False
    assert "mayúscula" in msg

    # Sin minúscula
    valid, msg = validate_password_policy("UPPERCASE123")
    assert valid is False
    assert "minúscula" in msg

    # Sin dígito
    valid, msg = validate_password_policy("NoDigitsHere")
    assert valid is False
    assert "dígito" in msg

    # Válida
    valid, msg = validate_password_policy("ValidPass123!")
    assert valid is True
    assert msg is None

def test_verify_password_invalid_hash():
    assert verify_password("secret", "invalid_hash_string") is False

@pytest.mark.asyncio
async def test_in_memory_token_revocation():
    token, jti, expire = create_access_token({"sub": "user123", "role": "Analista_QA"})
    
    # Inicialmente no revocada
    assert await is_token_revoked(jti) is False

    # Revocar token
    await revoke_token(jti, expire)
    assert await is_token_revoked(jti) is True

    # Token expirada en memoria debe borrarse y retornar False
    past_expire = datetime.now(timezone.utc) - timedelta(seconds=10)
    await revoke_token("exp_jti", past_expire)
    assert await is_token_revoked("exp_jti") is False

@pytest.mark.asyncio
async def test_user_tokens_invalidation_by_role_change():
    user_id = "user_456"
    now_ts = datetime.now(timezone.utc).timestamp()
    
    # Antes de revocar
    assert await is_user_token_invalidated_by_role_change(user_id, now_ts + 10) is False

    # Revocar todos los tokens del usuario
    await revoke_all_user_tokens(user_id)

    # Token emitida ANTES del cambio de rol (iat < revoked_before) debe estar invalidada
    assert await is_user_token_invalidated_by_role_change(user_id, now_ts - 5) is True

    # Token emitida DESPUÉS del cambio de rol (iat > revoked_before) NO debe estar invalidada
    assert await is_user_token_invalidated_by_role_change(user_id, now_ts + 100) is False

@pytest.mark.asyncio
async def test_redis_mock_branches():
    import app.core.security as sec
    sec._redis_checked = False
    sec._cached_redis = None

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.set = AsyncMock()
    mock_redis.get = AsyncMock(return_value="1")

    with patch("app.core.security.aioredis.from_url", return_value=mock_redis):
        client = await _get_redis()
        assert client is not None

        # Revocar token con Redis mock
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        await revoke_token("jti_redis", exp)
        assert await is_token_revoked("jti_redis") is True

        # Invalidate user tokens con Redis mock
        await revoke_all_user_tokens("user_redis")
        assert await is_user_token_invalidated_by_role_change("user_redis", 0) is True
