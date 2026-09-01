from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.support import SupportSearchRequest, SupportSearchResponse, SupportResource

router = APIRouter()

KNOWN_DIRECTORIES = [
    SupportResource(
        name="Psychology Today",
        description="Find a therapist directory with detailed provider profiles",
        url="https://www.psychologytoday.com/us/therapists",
        type="directory",
    ),
    SupportResource(
        name="SAMHSA National Helpline",
        description="Free referral service for substance abuse and mental health",
        phone="1-800-662-4357",
        url="https://www.samhsa.gov/find-help/national-helpline",
        type="helpline",
    ),
    SupportResource(
        name="NAMI Helpline",
        description="National Alliance on Mental Illness helpline",
        phone="1-800-950-6264",
        url="https://www.nami.org/help",
        type="helpline",
    ),
    SupportResource(
        name="Crisis Text Line",
        description="Text HOME to 741741 for crisis support",
        phone="741741",
        type="crisis",
    ),
    SupportResource(
        name="988 Suicide & Crisis Lifeline",
        description="Call or text 988 for 24/7 crisis support",
        phone="988",
        type="crisis",
    ),
]

@router.post("/search", response_model=SupportSearchResponse)
async def search_support(
    data: SupportSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return SupportSearchResponse(
        resources=KNOWN_DIRECTORIES,
        message=f"Here are mental health resources that may help. For location-specific providers in {data.location}, we recommend searching Psychology Today's directory or contacting local mental health boards.",
    )
