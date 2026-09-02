from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import engine, Base, run_migrations
from app.core.rate_limit import limiter, rate_limit_exceeded_handler, rate_limit_enabled
from app.core.integrations import get_integrations_status
from app.models import user, conversation, message, mood
from app.api import auth, chat, conversations, support, mood as mood_router, settings as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if settings.JWT_SECRET_KEY in ("change-me-in-production", "change-me-in-production-use-a-real-secret"):
        print("WARNING: JWT_SECRET_KEY is set to a default value. Set a long random secret before deploying.")
    yield

app = FastAPI(
    title="SafeSpace AI",
    description="AI-Powered Multi-Agent Mental Wellness Support Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:8000; font-src 'self' data:"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app.add_middleware(SecurityHeadersMiddleware)

if rate_limit_enabled():
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(429, rate_limit_exceeded_handler)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["Conversations"])
app.include_router(support.router, prefix="/api/v1/support", tags=["Support"])
app.include_router(mood_router.router, prefix="/api/v1/mood", tags=["Mood"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["Settings"])

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "SafeSpace AI"}

@app.get("/api/v1/health/integrations")
async def integrations_check():
    return get_integrations_status()

@app.get("/")
async def root():
    return {
        "service": "SafeSpace AI API",
        "message": "Welcome to the SafeSpace AI backend.",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
