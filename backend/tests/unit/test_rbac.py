import pytest
from hypothesis import given, strategies as st
from fastapi import HTTPException
from app.models.models import User
from app.core.dependencies import require_role

# Property 4: Restricción de escritura por rol Observador (Req. 2.5, 2.7)
@given(
    allowed_roles=st.lists(st.sampled_from(["Administrador", "Líder_QA", "Analista_QA"]), min_size=1, max_size=3)
)
@pytest.mark.asyncio
async def test_property_4_observer_write_restriction(allowed_roles):
    observer_user = User(
        username="observador_test",
        password_hash="hash",
        role="Observador"
    )
    
    checker = require_role(allowed_roles)
    with pytest.raises(HTTPException) as exc_info:
        await checker(current_user=observer_user)
        
    assert exc_info.value.status_code == 403
    assert "No tiene permisos" in exc_info.value.detail
