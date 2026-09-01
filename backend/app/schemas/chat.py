from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[uuid.UUID] = None

class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message: str
    agent_used: str
    risk_level: str
    resources: List[str] = []
    message_id: uuid.UUID
    created_at: datetime

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    agent_used: Optional[str] = None
    risk_level: str = "LOW"
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

class ConversationListResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True
