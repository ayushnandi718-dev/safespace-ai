from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from fastapi.responses import JSONResponse

limiter = Limiter(
    key_func=get_remote_address,
    enabled=True,
    default_limits=[],
    headers_enabled=False,
)


def rate_limit_enabled() -> bool:
    from app.core.config import settings

    return settings.RATE_LIMIT_ENABLED


def rate_limit_exceeded_handler(request: Request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
        headers={"Retry-After": str(getattr(exc, "retry_after", 60))},
    )