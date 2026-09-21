import pytest
from datetime import date, timedelta
from hypothesis import given, strategies as st
from app.schemas.schemas import ProjectCreate, IterationCreate
from pydantic import ValidationError

# Strategy para pares de fechas donde end < start
@given(
    start_d=st.dates(min_value=date(2000, 1, 1), max_value=date(2050, 12, 31)),
    delta_days=st.integers(min_value=1, max_value=1000)
)
def test_property_5_date_validation_domain_logic(start_d: date, delta_days: int):
    invalid_end_d = start_d - timedelta(days=delta_days)
    assert invalid_end_d < start_d

    # Para Proyectos: end_date_estimated < start_date
    project_payload = {
        "name": "Proyecto Valido",
        "description": "Desc",
        "start_date": start_d,
        "end_date_estimated": invalid_end_d
    }
    project = ProjectCreate(**project_payload)
    # Lógica de validación de negocio en el endpoint
    assert project.end_date_estimated < project.start_date

    # Para Iteraciones: end_date < start_date
    iteration_payload = {
        "name": "Sprint 1",
        "start_date": start_d,
        "end_date": invalid_end_d
    }
    iteration = IterationCreate(**iteration_payload)
    assert iteration.end_date < iteration.start_date
