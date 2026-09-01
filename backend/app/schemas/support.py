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

class SupportSearchResponse(BaseModel):
    resources: List[SupportResource]
    message: str
