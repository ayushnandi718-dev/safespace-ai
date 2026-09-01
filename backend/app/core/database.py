from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def run_migrations() -> None:
    """Idempotently bring an existing SQLite database up to date with model changes.
    create_all() adds new tables but does not alter existing ones, so we add any
    missing columns for legacy databases."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    async with engine.begin() as conn:
        from sqlalchemy import inspect

        def _migrate(sync_conn):
            inspector = inspect(sync_conn)

            if inspector.has_table("users"):
                existing_cols = {col["name"] for col in inspector.get_columns("users")}
                delineated = [
                    ("theme", "VARCHAR(20) DEFAULT 'dark' NOT NULL"),
                    ("email_notifications", "BOOLEAN DEFAULT 1 NOT NULL"),
                ]
                for col_name, col_def in delineated:
                    if col_name not in existing_cols:
                        sync_conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")

            if inspector.has_table("conversations"):
                existing_cols = {col["name"] for col in inspector.get_columns("conversations")}
                if "updated_at" not in existing_cols:
                    sync_conn.exec_driver_sql("ALTER TABLE conversations ADD COLUMN updated_at DATETIME")

        await conn.run_sync(_migrate)