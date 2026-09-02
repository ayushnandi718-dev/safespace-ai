from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.support import SupportSearchRequest, SupportSearchResponse, SupportResource
from app.core.support_search import search_support_resources, search_nearby_places, normalize_search_query

router = APIRouter()

@router.post("/search", response_model=SupportSearchResponse)
async def search_support(
    data: SupportSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.query:
        result = search_nearby_places(data.query, data.location)
        return SupportSearchResponse(
            resources=result["resources"],
            message=result["message"],
            location=data.location,
            support_type=data.support_type or result.get("query") or "local",
            query=result.get("query"),
            source=result.get("source"),
            country="local",
        )

    result = search_support_resources(data.location, data.support_type or "")
    return SupportSearchResponse(
        resources=result["resources"],
        message=result["message"],
        location=data.location,
        support_type=data.support_type or "therapist",
        query=result.get("query"),
        source=result["source"],
        country=result["country"],
    )