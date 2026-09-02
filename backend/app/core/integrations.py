import httpx
from app.core.config import settings

INTEGRATIONS = [
    {
        "key": "GROQ_API_KEY",
        "name": "Groq AI (chat & emotional support)",
        "used_for": "Powering SafeSpace's empathetic support-agent responses.",
    },
    {
        "key": "IPGEOLOCATION_API_KEY",
        "name": "ipgeolocation.io (therapist location)",
        "used_for": "Estimating your approximate region to recommend nearby therapists.",
    },
    {
        "key": "TWILIO_ACCOUNT_SID",
        "name": "Twilio (emergency SMS notifications)",
        "used_for": "Notifying your emergency contact during a crisis simulation.",
    },
]

def _is_groq_key_valid(api_key: str) -> bool:
    try:
        resp = httpx.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return True
        if resp.status_code == 401:
            return False
    except Exception:
        pass
    return False

def get_integrations_status() -> dict:
    statuses = []

    groq_configured = bool(settings.GROQ_API_KEY)
    if groq_configured:
        groq_valid = _is_groq_key_valid(settings.GROQ_API_KEY)
        groq_status = "active" if groq_valid else "expired"
    else:
        groq_valid = False
        groq_status = "missing"
    statuses.append({
        **INTEGRATIONS[0],
        "configured": groq_configured,
        "valid": groq_valid,
        "status": groq_status,
    })

    ipgeo_configured = bool(settings.IPGEOLOCATION_API_KEY)
    statuses.append({
        **INTEGRATIONS[1],
        "configured": ipgeo_configured,
        "valid": ipgeo_configured,
        "status": "active" if ipgeo_configured else "missing",
    })

    twilio_configured = bool(settings.TWILIO_ACCOUNT_SID)
    twilio_complete = all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_FROM_NUMBER,
        settings.EMERGENCY_CONTACT,
    ])
    statuses.append({
        **INTEGRATIONS[2],
        "configured": twilio_configured,
        "valid": twilio_complete,
        "status": "active" if twilio_complete else ("partial" if twilio_configured else "missing"),
    })

    problems = [
        s for s in statuses
        if s["status"] in ("missing", "expired")
    ]

    if settings.CONFIRM_REAL_CALL and any(
        s["key"] == "TWILIO_ACCOUNT_SID" and s["status"] == "partial"
        for s in statuses
    ):
        problems.append(next(s for s in statuses if s["key"] == "TWILIO_ACCOUNT_SID"))

    return {
        "status": "ok" if not problems else "degraded",
        "integrations": statuses,
        "problems": problems,
    }