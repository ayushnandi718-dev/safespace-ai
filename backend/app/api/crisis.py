import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from fastapi import Request
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limit import limiter
from app.core.config import settings
from app.models.user import User
from app.models.conversation import Conversation
from app.models.crisis import CrisisEscalation

router = APIRouter()

VALID_ACTIONS = {"notify_contact", "call_emergency"}

class CrisisActionRequest(BaseModel):
    conversation_id: Optional[uuid.UUID] = None
    risk_level: str = "HIGH"
    action: str
    confirmed: bool = False

class CrisisActionResponse(BaseModel):
    status: str
    message: str
    action: str
    risk_level: str
    simulation: bool
    escalation_id: Optional[str] = None

def _twilio_send_alert():
    have_twilio = all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_FROM_NUMBER,
        settings.EMERGENCY_CONTACT,
    ])
    if not have_twilio:
        return False, "Twilio is not configured. No alert was sent."
    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        body = (
            settings.EMERGENCY_CALL_MESSAGE
            or "SafeSpace AI emergency alert: a user has requested urgent support. Reach out to them as soon as possible."
        )
        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_FROM_NUMBER,
            to=settings.EMERGENCY_CONTACT,
        )
        return True, f"Alert sent to your emergency contact (SID {message.sid})."
    except Exception as exc:
        return False, f"Unable to send the alert: {type(exc).__name__}."

@router.post("/escalate", response_model=CrisisActionResponse)
@limiter.limit("5/minute")
async def escalate_crisis(
    request: Request,
    data: CrisisActionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.action not in VALID_ACTIONS:
        raise HTTPException(status_code=400, detail="Invalid action. Use notify_contact or call_emergency.")

    if not data.confirmed:
        raise HTTPException(status_code=400, detail="Explicit confirmation is required before escalation.")

    if data.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == data.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

    action_name = "notify_contact" if data.action == "notify_contact" else "call_emergency"
    simulation = not settings.CONFIRM_REAL_CALL

    if action_name == "call_emergency":
        escalation = CrisisEscalation(
            user_id=current_user.id,
            conversation_id=data.conversation_id,
            risk_level=data.risk_level,
            action_requested=action_name,
            action_completed="simulated" if simulation else "completed",
            status="simulation" if simulation else "completed",
            details="Emergency call escalation requested with explicit confirmation.",
        )
        db.add(escalation)
        await db.commit()
        await db.refresh(escalation)
        if simulation:
            message = (
                "Emergency call escalation was simulated. "
                "No real call was placed. Please contact local emergency services if you are in danger."
            )
        else:
            message = "Emergency services escalation requested. Please continue following local emergency guidance."
        return CrisisActionResponse(
            status="simulation" if simulation else "completed",
            message=message,
            action=action_name,
            risk_level=data.risk_level,
            simulation=simulation,
            escalation_id=str(escalation.id),
        )

    sent, alert_message = _twilio_send_alert()

    action_completed = "sent" if sent else "failed"
    escalation = CrisisEscalation(
        user_id=current_user.id,
        conversation_id=data.conversation_id,
        risk_level=data.risk_level,
        action_requested=action_name,
        action_completed="simulated" if simulation else action_completed,
        status="simulation" if simulation else action_completed,
        details=alert_message,
    )
    db.add(escalation)
    await db.commit()
    await db.refresh(escalation)

    if simulation:
        message = (
            "Emergency contact notification was simulated. "
            "No real message was sent. Please contact your local emergency services if you are in immediate danger."
        )
    elif sent:
        message = alert_message
    else:
        message = alert_message

    return CrisisActionResponse(
        status="simulation" if simulation else ("sent" if sent else "failed"),
        message=message,
        action=action_name,
        risk_level=data.risk_level,
        simulation=simulation,
        escalation_id=str(escalation.id),
    )