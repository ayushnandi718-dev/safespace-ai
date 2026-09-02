import uuid
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db

ANONYMOUS_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
ANONYMOUS_USER_EMAIL = "guest@safespace.ai"

async def get_current_user(db: AsyncSession = Depends(get_db)):
    from app.models.user import User

    result = await db.execute(select(User).where(User.id == ANONYMOUS_USER_ID))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id=ANONYMOUS_USER_ID,
            name="Guest",
            email=ANONYMOUS_USER_EMAIL,
            hashed_password="!",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user