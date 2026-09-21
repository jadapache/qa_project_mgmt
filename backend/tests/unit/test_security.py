import pytest
from hypothesis import given, settings, strategies as st
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

# Strategy para contraseñas válidas: ≥ 10 chars, ≤ 30 chars, al menos 1 mayúscula, 1 minúscula, 1 dígito
valid_password_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')),
    min_size=10,
    max_size=30
).filter(
    lambda p: any(c.isupper() for c in p) and any(c.islower() for c in p) and any(c.isdigit() for c in p)
)

# Property 1: Round-trip de hash de contraseña (Req. 1.9, 1.10)
@settings(max_examples=10, deadline=None)
@given(password=valid_password_strategy)
def test_property_1_password_hash_roundtrip(password: str):
    hashed = hash_password(password)
    # Debe verificar correctamente con la contraseña original
    assert verify_password(password, hashed) is True
    # No debe verificar con una contraseña modificada al inicio
    assert verify_password("X" + password, hashed) is False


# Strategy para roles válidos e identificadores de usuario
valid_roles = st.sampled_from(["Administrador", "Líder_QA", "Analista_QA", "UAT_Tester", "Observador"])

# Property 2: Integridad del payload de rol en el JWT (Req. 1.11, 2.1)
@settings(max_examples=50)
@given(user_id=st.uuids(), username=st.text(min_size=3, max_size=30), role=valid_roles)
def test_property_2_jwt_role_payload_integrity(user_id, username, role):
    data = {"sub": str(user_id), "username": username, "role": role}
    token, jti, expire = create_access_token(data)
    
    payload = decode_access_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["username"] == username
    assert payload["role"] == role
    assert payload["jti"] == jti
