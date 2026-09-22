from abc import ABC, abstractmethod
from typing import Any, Dict
from app.db.base import IGenericRepository


class ITestPlanRepository(IGenericRepository[Dict[str, Any], str], ABC):
    """Interfaz abstracta para el repositorio de Planes de Prueba QA."""

    @abstractmethod
    async def create_test_plan(self, feature_name: str, content: str, test_type: str = "regression") -> Dict[str, Any]:
        """Crea y almacena un plan de prueba de QA."""
        pass
