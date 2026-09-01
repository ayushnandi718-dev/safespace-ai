from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # SQLite is the zero-config default for local demos.
    # For production, switch to PostgreSQL:
    #   postgresql+asyncpg://postgres:postgres@localhost:5432/safespace
    DATABASE_URL: str = "sqlite+aiosqlite:///./safespace.db"
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "openai/gpt-oss-120b"
    THERAPIST_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    EMERGENCY_CONTACT: str = ""
    CONFIRM_REAL_CALL: bool = False
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    RATE_LIMIT_ENABLED: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
