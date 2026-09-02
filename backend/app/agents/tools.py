from langchain_core.tools import tool
from app.core.config import settings
from app.core.llm import get_chat_model, has_chat_model
from app.core.support_search import search_nearby_places, detect_country

@tool
def ask_mental_health_specialist(query: str) -> str:
    """Provide empathetic, non-diagnostic mental-health support and guidance.
    Use this for emotional support, stress, anxiety, coping strategies, or
    general psychological guidance."""
    if not has_chat_model():
        return (
            "I understand you're going through a difficult time. While I'm experiencing "
            "a technical limitation right now, I want you to know that your feelings are "
            "valid. Please consider reaching out to a mental health professional or "
            "trusted person in your life."
        )

    llm = get_chat_model(model=settings.LLM_MODEL, temperature=0.7, max_tokens=600)

    specialist_prompt = (
        "You are a warm, empathetic support companion (not a licensed professional). "
        "Respond naturally to the user's message: "
        "- Acknowledge and validate their feelings. "
        "- Normalize their experience gently. "
        "- Offer practical, general wellness suggestions as optional ideas. "
        "- Ask one open-ended question to encourage reflection. "
        "- Keep it concise and conversational. "
        "- Never diagnose, never prescribe, never claim to be a therapist or doctor."
    )

    try:
        response = llm.invoke([
            ("system", specialist_prompt),
            ("user", query),
        ])
        return response.content.strip()
    except Exception:
        return (
            "I'm having a technical issue right now, but your feelings matter. "
            "Please try again in a moment."
        )

@tool
def search_nearby_places_tool(query: str, location: str) -> str:
    """Search for any healthcare or wellness professional, clinic, hospital,
    pharmacy, or public place near a given location.

    Use this for ANY request asking to find or locate something nearby:
    doctors (e.g. orthopedic, dentist, cardiologist, rheumatologist),
    hospitals, clinics, pharmacies, therapists, counselors, psychiatrists,
    diagnostic labs, etc.

    Args:
        query: What the user wants to find (e.g. "orthopedic doctor", "dentist", "hospital").
        location: The city, area, or region to search in (e.g. "Alipurduar, West Bengal, India").
    """
    loc = (location or "").strip()
    if not loc:
        return "Could you share your city or area so I can search for nearby providers?"

    result = search_nearby_places(query or "", loc)
    resources = result.get("resources", [])

    if not resources:
        return (
            f"I couldn't retrieve live {result.get('query', 'provider')} results near {loc} right now. "
            "Please try again in a moment, or try a more specific location. "
            "If you need urgent help, call your local emergency number."
        )

    lines = [f"Here are {result['query']}s near {loc}:"]
    for r in resources[:6]:
        row = r.name
        if r.address:
            row += f" — {r.address}"
        if getattr(r, "rating", None):
            row += f" (rated {r.rating:.1f})"
        if r.phone:
            row += f" · {r.phone}"
        lines.append(row)
    lines.append("Use the map links for directions. Only verified results are shown.")
    return "\n".join(lines)

@tool
def locate_therapist_tool(location: str) -> str:
    """Provide guidance for finding licensed mental-health professionals.
    Use when the user asks for therapists, counselors, psychologists, or
    nearby professional mental-health resources near a given location."""
    loc = location.strip() if location else ""
    if not loc:
        return "Could you share your city or area so I can help you find relevant resources?"

    result = search_nearby_places("therapist", loc)
    resources = result.get("resources", [])

    if resources:
        lines = [f"Here are mental-health providers near {loc}:"]
        for r in resources[:5]:
            row = r.name
            if r.address:
                row += f" — {r.address}"
            if r.phone:
                row += f" · {r.phone}"
            lines.append(row)
        lines.append("Use the map links for directions. Only verified results are shown.")
        return "\n".join(lines)

    if settings.IPGEOLOCATION_API_KEY:
        try:
            import httpx
            geo = httpx.get(
                "https://api.ipgeolocation.io/ipgeo",
                params={"apiKey": settings.IPGEOLOCATION_API_KEY},
                timeout=10,
            ).json()
            city = geo.get("city") or ""
            country = geo.get("country_name") or ""
            state = geo.get("state_prov") or ""
            lat = geo.get("latitude")
            lng = geo.get("longitude")
            geo_area = ", ".join(x for x in [city, state, country] if x)
            map_url = ""
            if lat and lng:
                map_url = f" (map: https://www.google.com/maps/search/therapist+near+{lat},{lng})"
            area_note = f" near {geo_area}" if geo_area else f" near {loc}"
            return (
                f"I found general resources for you{area_note}{map_url}.\n\n"
                "1. Psychology Today Directory: psychologytoday.com/us/therapists\n"
                "2. Ask your primary-care doctor for a referral\n"
                "3. Local mental health boards or hospitals\n"
                "4. Online platforms like BetterHelp or Talkspace\n\n"
                "If you need urgent help, contact a local emergency number "
                "(911 in the US, 112 in the EU, 100 in India) or text HOME to 741741."
            )
        except Exception:
            pass

    return (
        f"Here's how to find quality mental health support near {loc}:\n\n"
        "1. Psychology Today Directory: psychologytoday.com/us/therapists\n"
        "   - Filter by location, insurance, and specialty\n\n"
        "2. Ask your primary-care doctor for a referral\n\n"
        "3. Check with local mental health boards or hospitals\n\n"
        "4. Online therapy platforms like BetterHelp or Talkspace\n\n"
        "Questions to ask before booking:\n"
        "- Are you licensed, and in what specialty?\n"
        "- What is your approach?\n"
        "- What are the fees, and do you accept insurance?\n\n"
        "If you need urgent help, call a local emergency number "
        "(911 in the US, 112 in the EU, 100 in India) or the Crisis Text Line "
        "(text HOME to 741741)."
    )

@tool
def emergency_call_tool() -> str:
    """Trigger the crisis-safe escalation workflow.
    Use ONLY for immediate danger, credible self-harm or suicidal intent,
    or intent to harm others. Simulation by default."""
    have_twilio = all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_FROM_NUMBER,
        settings.EMERGENCY_CONTACT,
    ])

    if not have_twilio:
        return (
            "[SIMULATION] Emergency support escalation triggered. "
            "If you are in immediate danger, please call your local emergency number now "
            "(911 in the US, 112 in the EU, 100 in India)."
        )

    if not settings.CONFIRM_REAL_CALL:
        return (
            "[SIMULATION] Emergency support escalation has been simulated. "
            "For immediate danger, contact your local emergency services now. "
            "You matter — please reach out to a trusted person nearby."
        )

    try:
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.calls.create(
            url=settings.TWIML_URL,
            from_=settings.TWILIO_FROM_NUMBER,
            to=settings.EMERGENCY_CONTACT,
        )
        return "A voice call was placed to your emergency contact."
    except Exception:
        return (
            "Unable to send the emergency notification. If you are in danger, "
            "please call local emergency services right now."
        )
