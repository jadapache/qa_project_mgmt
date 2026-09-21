import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
import redis.asyncio as aioredis
from app.core.config import settings

# En-memoria fallback si Redis no está corriendo localmente
_in_memory_revoked_tokens: Dict[str, datetime] = {}
_in_memory_user_revocations: Dict[str, float] = {}

redis_client = None

async def _get_redis():
    try:
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        return client
    except Exception:
        return None

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def validate_password_policy(password: str) -> tuple[bool, Optional[str]]:
    if len(password) < 10:
        return False, "La contraseña debe tener al menos 10 caracteres."
    if not any(c.isupper() for c in password):
        return False, "La contraseña debe contener al menos una letra mayúscula."
    if not any(c.islower() for c in password):
        return False, "La contraseña debe contener al menos una letra minúscula."
    if not any(c.isdigit() for c in password):
        return False, "La contraseña debe contener al menos un dígito numerico."
    return True, None

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> tuple[str, str, datetime]:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    jti = str(uuid.uuid4())
    to_encode.update({
        "iat": now,
        "exp": expire,
        "jti": jti
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt, jti, expire

def decode_access_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

async def revoke_token(jti: str, expires_at: datetime) -> None:
    client = await _get_redis()
    if client:
        try:
            now = datetime.now(timezone.utc)
            ttl_seconds = int((expires_at - now).total_seconds())
            if ttl_seconds > 0:
                await client.set(f"revoked_token:{jti}", "1", ex=ttl_seconds)
            return
        except Exception:
            pass
    _in_memory_revoked_tokens[jti] = expires_at

async def is_token_revoked(jti: str) -> bool:
    client = await _get_redis()
    if client:
        try:
            res = await client.get(f"revoked_token:{jti}")
            return res is not None
        except Exception:
            pass
    expires_at = _in_memory_revoked_tokens.get(jti)
    if expires_at:
        if datetime.now(timezone.utc) > expires_at:
            del _in_memory_revoked_tokens[jti]
            return False
        return True
    return False

async def revoke_all_user_tokens(user_id: str) -> None:
    client = await _get_redis()
    now_ts = datetime.now(timezone.utc).timestamp()
    if client:
        try:
            await client.set(f"user_revoked_before:{user_id}", str(now_ts), ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
            return
        except Exception:
            pass
    _in_memory_user_revocations[user_id] = now_ts

async def is_user_token_invalidated_by_role_change(user_id: str, iat: float) -> bool:
    client = await _get_redis()
    if client:
        try:
            revoked_before = await client.get(f"user_revoked_before:{user_id}")
            if revoked_before and iat < float(revoked_before):
                return True
            return False
        except Exception:
            pass
    revoked_before = _in_memory_user_revocations.get(user_id)
    if revoked_before and iat < revoked_before:
        return True
    return False
