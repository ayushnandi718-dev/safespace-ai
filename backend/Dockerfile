FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (minimal build tools if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend project
COPY pyproject.toml ./
COPY .env.example .env.example

# Install dependencies (editable install picks up the package metadata)
RUN pip install --no-cache-dir "fastapi>=0.115.0" "uvicorn[standard]>=0.30.0" \
    "pydantic>=2.0.0" "pydantic-settings>=2.0.0" "python-dotenv>=1.0.0" \
    "sqlalchemy[asyncio]>=2.0.0" "asyncpg>=0.30.0" "aiosqlite>=0.20.0" \
    "bcrypt>=4.0.0" "python-jose[cryptography]>=3.3.0" \
    "langchain>=0.3.0" "langgraph>=0.2.0" "langchain-groq>=0.2.0" \
    "python-multipart>=0.0.9" "email-validator>=2.0.0" "httpx>=0.27.0" "slowapi>=0.1.9"

# Copy application code
COPY app ./app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]