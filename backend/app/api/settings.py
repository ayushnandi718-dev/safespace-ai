from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, Field
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash, verify_password
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message

router = APIRouter()

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    theme: Optional[str] = Field(default=None, pattern="^(dark|light)$")
    email_notifications: Optional[bool] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class UserSettingsResponse(BaseModel):
    id: str
    name: str
    email: str
    theme: str
    email_notifications: bool
    created_at: str

@router.get("", response_model=UserSettingsResponse)
async def get_settings(current_user: User = Depends(get_current_user)):
    return UserSettingsResponse(
        id=str(current_user.id),
        name=current_user.name,
        email=current_user.email,
        theme=current_user.theme,
        email_notifications=current_user.email_notifications,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )

@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    data: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.name:
        current_user.name = data.name
    if data.email:
        current_user.email = data.email
    if data.theme:
        current_user.theme = data.theme
    if data.email_notifications is not None:
        current_user.email_notifications = data.email_notifications
    await db.commit()
    await db.refresh(current_user)
    return UserSettingsResponse(
        id=str(current_user.id),
        name=current_user.name,
        email=current_user.email,
        theme=current_user.theme,
        email_notifications=current_user.email_notifications,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}

@router.delete("/conversations")
async def delete_all_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(Message).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == current_user.id)
            )
        )
    )
    await db.execute(
        delete(Conversation).where(Conversation.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "All conversations deleted"}

@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        delete(Message).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.user_id == current_user.id)
            )
        )
    )
    await db.execute(
        delete(Conversation).where(Conversation.user_id == current_user.id)
    )
    await db.delete(current_user)
    await db.commit()
