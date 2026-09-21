import pytest
from hypothesis import given, settings, strategies as st
from app.services.uat_service import compute_uat_metrics

# Property 7: Métricas de sesión UAT (Req. 4.4, 4.5)
@settings(max_examples=100)
@given(
    total_invited=st.integers(min_value=0, max_value=5000),
    voted_testers=st.integers(min_value=0, max_value=5000),
    approved_votes=st.integers(min_value=0, max_value=5000)
)
def test_property_7_uat_session_metrics(total_invited: int, voted_testers: int, approved_votes: int):
    voted = min(voted_testers, total_invited)
    approved = min(approved_votes, voted)

    part_pct, app_pct = compute_uat_metrics(total_invited, voted, approved)

    # 1. Porcentajes acotados entre 0.0 y 100.0
    assert 0.0 <= part_pct <= 100.0
    assert 0.0 <= app_pct <= 100.0

    # 2. Si nadie fue invitado -> participación es 0.0
    if total_invited == 0:
        assert part_pct == 0.0

    # 3. Si nadie votó -> aprobación es 0.0
    if voted == 0:
        assert app_pct == 0.0

    # 4. Si votaron todos -> participación es 100.0
    if voted == total_invited and total_invited > 0:
        assert part_pct == 100.0

    # 5. Si todos aprobaron -> aprobación es 100.0
    if approved == voted and voted > 0:
        assert app_pct == 100.0
