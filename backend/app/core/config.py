from pydantic_settings import BaseSettings
from typing import Any, List
import json

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
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_ENABLE_THINKING: bool = False
    NVIDIA_REASONING_BUDGET: int = 2048
    THERAPIST_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    IPGEOLOCATION_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    EMERGENCY_CONTACT: str = ""
    EMERGENCY_CALL_MESSAGE: str = (
        "Hello. This is SafeSpace AI. An emergency contact notification has been requested. "
        "Please contact the user as soon as possible and check on their safety."
    )
    TWIML_URL: str = "https://safespace-ai-api.onrender.com/api/v1/crisis/twiml"
    CONFIRM_REAL_CALL: bool = False
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    RATE_LIMIT_ENABLED: bool = True
    RENDER_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return self._parse_cors_origins(self.CORS_ORIGINS)

    @staticmethod
    def _parse_cors_origins(v: Any) -> List[str]:
        if v is None:
            return ["http://localhost:3000"]
        if isinstance(v, (list, tuple)):
            return list(v)
        s = str(v).strip()
        if not s:
            return ["http://localhost:3000"]
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, TypeError):
            pass
        cleaned = s.strip().strip("[]'\"")
        return [o.strip().strip("\"'") for o in cleaned.split(",") if o.strip().strip("\"'")]

    class Config:
        env_file = ".env"

settings = Settings()
