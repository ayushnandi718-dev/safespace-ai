import re
from enum import Enum
from pydantic import BaseModel

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    IMMEDIATE = "IMMEDIATE"

class RiskAssessment(BaseModel):
    risk_level: RiskLevel
    requires_crisis_protocol: bool
    reason: str

_HIGH_PATTERNS = [
    re.compile(r"\b(?:kill(?:ing)?|suicide|suicidal|end\s*(?:my|your|his|her)\s*life)\b", re.I),
    re.compile(r"\b(?:self[\s-]*harm|cut(?:ting)?\s*(?:my|your|him|her)?self)\b", re.I),
    re.compile(r"\b(?:want\s*to\s*die|wish\s*(?:i|he|she|they)\s*(?:were|was)\s*dead)\b", re.I),
    re.compile(r"\b(?:hurt(?:ing)?\s*(?:my|your|him|her)?self)\b", re.I),
    re.compile(r"\b(?:jump\s*(?:off|in front of)|overdose|no\s*reason\s*to\s*live)\b", re.I),
]

_IMMEDIATE_PATTERNS = [
    re.compile(r"\b(?:going\s*to\s*(?:kill|hurt)\s*(?:someone|them|him|her|you))\b", re.I),
    re.compile(r"\b(?:have\s*(?:a\s*)?(?:gun|knife|weapon|plan)\s*to\s*(?:kill|hurt))\b", re.I),
    re.compile(r"\b(?:right\s*now.*(?:kill|hurt|die|end\s*it))\b", re.I),
    re.compile(r"\b(?:about\s*to\s*(?:end|kill|hurt))\b", re.I),
]

_MODERATE_PATTERNS = [
    re.compile(r"\b(?:can'?t\s*(?:go\s*on|take\s*it|do\s*this)|give\s*up)\b", re.I),
    re.compile(r"\b(?:hopeless|worthless|nothing\s*matters|nobody\s*cares)\b", re.I),
    re.compile(r"\b(?:broken|empty|numb|exhausted\s*(?:emotionally|mentally))\b", re.I),
]

def _matches_any(text: str, patterns: list) -> bool:
    return any(p.search(text) for p in patterns)

def assess_risk(message: str) -> RiskAssessment:
    if _matches_any(message, _IMMEDIATE_PATTERNS):
        return RiskAssessment(
            risk_level=RiskLevel.IMMEDIATE,
            requires_crisis_protocol=True,
            reason="Immediate danger detected",
        )
    if _matches_any(message, _HIGH_PATTERNS):
        return RiskAssessment(
            risk_level=RiskLevel.HIGH,
            requires_crisis_protocol=True,
            reason="High-risk language detected",
        )
    if _matches_any(message, _MODERATE_PATTERNS):
        return RiskAssessment(
            risk_level=RiskLevel.MODERATE,
            requires_crisis_protocol=False,
            reason="Distress signals detected",
        )
    return RiskAssessment(
        risk_level=RiskLevel.LOW,
        requires_crisis_protocol=False,
        reason="No significant risk indicators",
    )
