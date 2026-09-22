from fastapi import APIRouter

from app.api import features, integrations, knowledge, settings as settings_api

api_router = APIRouter(prefix="/api")
api_router.include_router(integrations.router)
api_router.include_router(settings_api.router)
api_router.include_router(knowledge.router)
api_router.include_router(features.router)
