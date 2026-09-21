import pytest
from hypothesis import given, settings, strategies as st
from app.services.qas_service import compute_qas_metrics

# Property 6: Fórmulas de certificación de calidad QaS (Req. 5.3, 5.4)
@settings(max_examples=100)
@given(
    total_tc=st.integers(min_value=0, max_value=10000),
    executed_tc=st.integers(min_value=0, max_value=10000),
    passed_tc=st.integers(min_value=0, max_value=10000)
)
def test_property_6_qas_certification_formulas(total_tc: int, executed_tc: int, passed_tc: int):
    # Truncar executed_tc para que no supere total_tc y passed_tc para que no supere executed_tc
    executed = min(executed_tc, total_tc)
    passed = min(passed_tc, executed)

    cov_pct, app_pct = compute_qas_metrics(total_tc, executed, passed)

    # 1. Los porcentajes deben estar entre 0.0 y 100.0
    assert 0.0 <= cov_pct <= 100.0
    assert 0.0 <= app_pct <= 100.0

    # 2. Si total_tc es 0 -> cobertura debe ser 0.0
    if total_tc == 0:
        assert cov_pct == 0.0

    # 3. Si executed es 0 -> aprobación debe ser 0.0
    if executed == 0:
        assert app_pct == 0.0

    # 4. Si ejecutados == total y total > 0 -> cobertura debe ser 100.0
    if executed == total_tc and total_tc > 0:
        assert cov_pct == 100.0

    # 5. Si pasados == ejecutados y ejecutados > 0 -> aprobación debe ser 100.0
    if passed == executed and executed > 0:
        assert app_pct == 100.0
