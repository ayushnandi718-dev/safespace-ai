import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Uuid
from app.core.database import Base

class CrisisEscalation(Base):
    __tablename__ = "crisis_escalations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, nullable=False)
    conversation_id = Column(Uuid, nullable=True)
    risk_level = Column(String(20), default="LOW")
    action_requested = Column(String(50), default="")
    action_completed = Column(String(50), default="")
    status = Column(String(20), default="")
    details = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))