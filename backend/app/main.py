import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from sqlalchemy import select

from app.core.config import settings
from app.core.rate_limiter import limiter
from app.db.base import init_db, AsyncSessionLocal
from app.models.models import User
from app.core.security import hash_password
from app.routers import auth, users, projects, iterations, stories, import_export, ingest, chat, ai_drafts, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar tablas en SQLite local si aplica
    await init_db()
    
    # Crear usuario Administrador inicial por defecto si la BD está vacía
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalars().first():
            admin_user = User(
                username="admin",
                password_hash=hash_password("Admin12345!"),
                role="Administrador",
                is_active=True
            )
            db.add(admin_user)
            await db.commit()
            print(">>> Usuario inicial 'admin' (password: Admin12345!) creado exitosamente.")
            
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan
)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware CORS (Req. 13.2)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Desarrollo local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware de seguridad HTTP & X-Request-ID (Req. 13.4, RNF-02.1)
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response: Response = await call_next(request)
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    
    return response

# Incluir Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(iterations.router, prefix=settings.API_V1_STR)
app.include_router(stories.router, prefix=settings.API_V1_STR)
app.include_router(import_export.router, prefix=settings.API_V1_STR)
app.include_router(ingest.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(ai_drafts.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
