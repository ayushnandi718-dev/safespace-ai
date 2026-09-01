from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
from datetime import datetime

class MoodCreateRequest(BaseModel):
    mood: int = Field(ge=1, le=5)
    note: Optional[str] = Field(default=None, max_length=500)

class MoodEntryResponse(BaseModel):
    id: uuid.UUID
    mood: int
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MoodDayPoint(BaseModel):
    date: str
    mood: int

class MoodStatsResponse(BaseModel):
    total_checkins: int
    average_mood: float
    current_streak: int
    recent: List[MoodDayPoint]
    trend: Optional[str] = None