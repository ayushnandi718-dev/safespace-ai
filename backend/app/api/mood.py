from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.mood import MoodEntry
from app.schemas.mood import MoodCreateRequest, MoodEntryResponse, MoodStatsResponse, MoodDayPoint

router = APIRouter()

@router.post("", response_model=MoodEntryResponse, status_code=201)
async def create_mood(
    data: MoodCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = MoodEntry(
        user_id=current_user.id,
        mood=data.mood,
        note=data.note,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return MoodEntryResponse.model_validate(entry)

@router.get("", response_model=list[MoodEntryResponse])
async def list_mood(
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = max(1, min(limit, 200))
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id)
        .order_by(desc(MoodEntry.created_at))
        .limit(limit)
    )
    return [MoodEntryResponse.model_validate(e) for e in result.scalars().all()]

@router.get("/stats", response_model=MoodStatsResponse)
async def mood_stats(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(MoodEntry)
        .where(MoodEntry.user_id == current_user.id, MoodEntry.created_at >= since)
        .order_by(MoodEntry.created_at)
    )
    entries = result.scalars().all()

    total = await db.execute(
        select(func.count(MoodEntry.id)).where(MoodEntry.user_id == current_user.id)
    )
    total_checkins = total.scalar() or 0

    moods = [e.mood for e in entries]
    average = round(sum(moods) / len(moods), 2) if moods else 0.0

    by_day: dict[str, list[int]] = {}
    zone = timezone.utc
    for e in entries:
        day = e.created_at.astimezone(zone).strftime("%Y-%m-%d")
        by_day.setdefault(day, []).append(e.mood)
    recent = [
        MoodDayPoint(date=day, mood=round(sum(vals) / len(vals)))
        for day, vals in sorted(by_day.items())
    ][-days:]

    streak = 0
    cursor = datetime.now(timezone.utc).date()
    seen = set(by_day.keys())
    while cursor.isoformat() in seen:
        streak += 1
        cursor -= timedelta(days=1)

    trend: str | None = None
    if len(recent) >= 2:
        first_half = [p.mood for p in recent[: len(recent) // 2]]
        second_half = [p.mood for p in recent[len(recent) // 2 :]]
        if first_half and second_half:
            diff = (sum(second_half) / len(second_half)) - (sum(first_half) / len(first_half))
            if diff >= 0.5:
                trend = "improving"
            elif diff <= -0.5:
                trend = "declining"
            else:
                trend = "stable"

    return MoodStatsResponse(
        total_checkins=total_checkins,
        average_mood=average,
        current_streak=streak,
        recent=recent,
        trend=trend,
    )