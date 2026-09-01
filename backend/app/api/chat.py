import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.core.database import get_db, async_session
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.agents.orchestrator import run_orchestration, stream_orchestration

router = APIRouter()

@router.post("", response_model=ChatResponse)
@limiter.limit("20/minute")
async def send_message(
    request: Request,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    else:
        conversation = Conversation(
            user_id=current_user.id,
            title=data.message[:80],
        )
        db.add(conversation)
        await db.flush()

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    recent_messages = list(reversed(result.scalars().all()))

    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.flush()

    context = [{"role": m.role, "content": m.content} for m in recent_messages]
    orchestration_result = await run_orchestration(data.message, context)

    ai_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=orchestration_result["response"],
        agent_used=orchestration_result["agent_used"],
        risk_level=orchestration_result["risk_level"],
    )
    db.add(ai_msg)

    conversation.updated_at = datetime.now(timezone.utc)
    if len(recent_messages) <= 1:
        conversation.title = data.message[:80]

    await db.commit()
    await db.refresh(ai_msg)

    return ChatResponse(
        conversation_id=conversation.id,
        message=orchestration_result["response"],
        agent_used=orchestration_result["agent_used"],
        risk_level=orchestration_result["risk_level"],
        resources=orchestration_result.get("resources", []),
        message_id=ai_msg.id,
        created_at=ai_msg.created_at,
    )

@router.post("/stream")
@limiter.limit("20/minute")
async def stream_message(
    request: Request,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
    else:
        conversation = Conversation(
            user_id=current_user.id,
            title=data.message[:80],
        )
        db.add(conversation)
        await db.flush()

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    recent_messages = list(reversed(result.scalars().all()))

    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.flush()
    await db.commit()

    context = [{"role": m.role, "content": m.content} for m in recent_messages]
    conv_id = str(conversation.id)

    async def event_generator():
        full_response = ""
        agent_used = "support"
        risk_level = "LOW"

        async for chunk in stream_orchestration(data.message, context):
            if chunk["type"] == "token":
                full_response += chunk["content"]
                yield f"data: {json.dumps(chunk)}\n\n"
            elif chunk["type"] == "metadata":
                agent_used = chunk.get("agent_used", "support")
                risk_level = chunk.get("risk_level", "LOW")
                yield f"data: {json.dumps(chunk)}\n\n"
            elif chunk["type"] == "done":
                async with async_session() as save_db:
                    ai_msg = Message(
                        conversation_id=uuid.UUID(conv_id),
                        role="assistant",
                        content=full_response,
                        agent_used=agent_used,
                        risk_level=risk_level,
                    )
                    save_db.add(ai_msg)

                    conv_result = await save_db.execute(
                        select(Conversation).where(Conversation.id == uuid.UUID(conv_id))
                    )
                    conv = conv_result.scalar_one_or_none()
                    if conv:
                        conv.updated_at = datetime.now(timezone.utc)

                    await save_db.commit()

                yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv_id, 'agent_used': agent_used, 'risk_level': risk_level})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
