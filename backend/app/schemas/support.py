from pydantic import BaseModel
from typing import Optional, List

class SupportSearchRequest(BaseModel):
    location: str
    support_type: Optional[str] = "therapist"

class SupportResource(BaseModel):
    name: str
    description: str
    url: Optional[str] = None
    phone: Optional[str] = None
    type: str
    address: Optional[str] = None
    rating: Optional[float] = None
    maps_url: Optional[str] = None
    source: Optional[str] = None

class SupportSearchResponse(BaseModel):
    resources: List[SupportResource]
    message: str
    location: Optional[str] = None
    support_type: Optional[str] = None
    source: Optional[str] = None
    country: Optional[str] = None