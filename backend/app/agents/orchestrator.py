from typing import AsyncGenerator, Optional
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import AIMessage
from pydantic import BaseModel, Field
from app.agents.risk_assessment import assess_risk, RiskLevel
from app.agents.tools import (
    ask_mental_health_specialist,
    locate_therapist_tool,
    emergency_call_tool,
    search_nearby_places_tool,
)
from app.core.llm import get_chat_model
from app.core.support_search import emergency_numbers, crisis_resources, search_nearby_places, normalize_search_query

_SEARCH_ACTIONS = [
    "find", "search", "lookup", "look up", "looking for", "look for",
    "show me", "get me", "need a", "need an", "recommend", "suggest",
    "recommendation", "nearest", "closest",
]

_HEALTHCARE_TERMS = [
    "doctor", "doctors", "clinic", "clinics", "hospital", "hospitals",
    "dental", "dentist", "dentists", "orthopedic", "orthopaedic",
    "orthopedist", "cardiologist", "dermatologist", "neurologist",
    "rheumatologist", "gastroenterologist", "endocrinologist", "urologist",
    "ophthalmologist", "ent doctor", "pediatrician", "paediatrician",
    "gynecologist", "gynaecologist", "general physician", "physiotherapist",
    "therapist", "therapists", "counselor", "counsellor", "psychiatrist",
    "psychologist", "mental health professional", "pharmacy", "medical store",
    "chemist", "diagnostic center", "diagnostic centre", "pathology lab",
    "blood test", "laboratory", "lab", "specialist", "nursing home",
    "medical center", "medical centre", "health center", "health centre",
]

def _looks_like_location_search(message: str):
    """Tri-state detection: True = clear search, False = clearly not,
    None = ambiguous (needs LLM intent classification)."""
    text = message.lower().strip()
    if not text:
        return False

    import re
    has_search_action = any(action in text for action in _SEARCH_ACTIONS)
    has_healthcare_term = any(term in text for term in _HEALTHCARE_TERMS)
    has_location_signal = bool(
        re.search(
            r"\b(near me|nearby|nearest|closest|near\s+\S+|around\s+(?:me|[A-Z])\w*|in\s+[A-Z])",
            message,
        )
    )

    clear_search = (has_search_action and has_healthcare_term) or (
        has_healthcare_term and has_location_signal
    )
    if clear_search:
        return True

    clearly_symptom = bool(
        re.search(
            r"\b(i\s+(?:feel|have|had|am|am\s+having)|my\s+\w+\s+(?:hurts|hurt|pain|is\s+painful|has\s+been\s+painful)|pain\s+in\s+my)\b",
            message,
        )
    )
    if clearly_symptom and not has_search_action:
        return False

    if has_search_action or has_healthcare_term or has_location_signal:
        return None

    return False

class IntentResult(BaseModel):
    intent: str = Field(
        description="One of: LOCATION_SEARCH, SYMPTOM_CHECK, SUPPORT_CHAT, GENERAL_CHAT"
    )
    search_query: str = Field(default="", description="What to search for, e.g. 'orthopedic doctor'")
    location: str = Field(default="", description="Search location, e.g. 'Alipurduar, West Bengal, India'")
    confidence: float = Field(default=0.5)

_INTENT_SYSTEM_PROMPT = """\
You are the intent router for SafeSpace AI, a health & wellness companion.

Classify the user's message into exactly one intent:

- LOCATION_SEARCH: the user wants to find or locate a professional, clinic,
  hospital, pharmacy, or place near a location. Examples: "find orthopedic near
  Delhi", "dentist near me", "recommend a dermatologist in Kolkata".
- SYMPTOM_CHECK: the user describes a health symptom they are experiencing
  ("my knee hurts", "I have chest pain"). Do NOT classify these as LOCATION_SEARCH.
- SUPPORT_CHAT: emotional, mental-health, stress, anxiety, or wellness conversation.
- GENERAL_CHAT: anything else (greetings, casual questions, general advice).

For LOCATION_SEARCH, also extract the search_query (the type of provider/place)
and the location if one is mentioned. Return concise JSON matching the schema.
"""

def _classify_intent_llm(message: str) -> IntentResult:
    llm = get_chat_model(temperature=0.0, max_tokens=200)
    try:
        structured = llm.with_structured_output(IntentResult)
        result = structured.invoke([
            ("system", _INTENT_SYSTEM_PROMPT),
            ("user", message),
        ])
        return result
    except Exception:
        return IntentResult(intent="GENERAL_CHAT", confidence=0.0)

_LOCATION_PATTERNS = [
    r"\b(?:in|near|around|at)\s+([A-Za-z][\w\s,.'-]{1,40}?)(?:[?.]|$)",
    r"\b(?:nearby|near me)\b",
]

def _extract_location(message: str) -> str:
    import re
    for pattern in _LOCATION_PATTERNS:
        m = re.search(pattern, message, re.IGNORECASE)
        if m:
            loc = m.group(1).strip() if m.lastindex else ""
            if loc and len(loc) <= 80:
                return loc
    return ""

def _crisis_response(location: str = "") -> str:
    info = emergency_numbers(location)
    emergency = info["emergency"]
    police = info["police"]
    numbers = [emergency]
    if police and police != emergency:
        numbers.append(police)
    numbers_text = " or ".join(numbers)
    return (
        "I hear you, and I want you to know that what you're feeling matters. "
        "You don't have to go through this alone.\n\n"
        "If you are in immediate danger, please call your local emergency "
        f"number right now — {numbers_text}.\n\n"
        "You can also reach out to:\n"
        "• Your national suicide & crisis hotline\n"
        "• A trusted friend, family member, or counselor nearby.\n\n"
        "Are you in immediate danger right now? I want to make sure you're safe."
    )

SYSTEM_PROMPT = """\
You are SafeSpace AI, a warm and empathetic AI health & wellness companion.
You support mental wellness, general health guidance, wellness advice, and finding
professional care. You are NOT a licensed therapist, psychologist, doctor, or
medical professional. You do NOT diagnose conditions, prescribe treatment, or
replace professional care.

You have access to these tools:
1. ask_mental_health_specialist — use for emotional support, stress, anxiety, \
   coping strategies, and general psychological guidance.
2. search_nearby_places_tool — use when the user wants to find ANY professional, \
   clinic, hospital, pharmacy, or place near a location. This includes doctors of \
   every specialty (orthopedic, dentist, cardiologist, psychiatrist, psychologist, \
   rheumatologist, etc.), hospitals, clinics, pharmacies, and mental-health providers. \
   Do NOT refuse a search just because it is outside mental health.
3. locate_therapist_tool — use to help find therapists, counselors, psychologists, \
   or mental-health providers in a given location.
4. emergency_call_tool — use ONLY when the user expresses immediate danger, \
   credible self-harm intent, suicidal intent, or another clear crisis situation.

Always:
- Respond kindly, clearly, and with empathy.
- Respect uncertainty and never fabricate diagnoses.
- Recommend professional care for medical needs; never give a definitive diagnosis.
- For provider searches, rely only on verified tool results. Never invent names,
  addresses, phone numbers, or ratings.
- If a user may be in immediate danger, prioritize safety over everything else.
- In crisis situations, encourage contacting local emergency services and a \
  trusted person nearby.
- Never claim a real emergency call was placed when the system is in simulation mode.
- Encourage professional help when appropriate.
"""

TOOLS = [
    ask_mental_health_specialist,
    search_nearby_places_tool,
    locate_therapist_tool,
    emergency_call_tool,
]

def _format_search_result(result: dict, location: str) -> str:
    resources = result.get("resources", [])
    query = result.get("query", "provider")
    if not resources:
        return (
            f"I couldn't retrieve live {query} results near {location} right now. "
            "Please try again in a moment or refine your location. "
            "For urgent care, call your local emergency number."
        )
    lines = [f"Here are {query}s near {location}:"]
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

def _get_llm():
    return get_chat_model(temperature=0.7, max_tokens=600)

def _build_agent():
    return create_react_agent(
        _get_llm(),
        tools=TOOLS,
        prompt=SYSTEM_PROMPT,
    )

def _find_search_location(user_message: str) -> str:
    return _extract_location(user_message)

def _route_intent(message: str) -> Optional[IntentResult]:
    quick = _looks_like_location_search(message)
    if quick is True:
        return IntentResult(
            intent="LOCATION_SEARCH",
            search_query=normalize_search_query(message),
            location=_extract_location(message),
            confidence=1.0,
        )
    if quick is None:
        return _classify_intent_llm(message)
    return IntentResult(intent="GENERAL_CHAT", confidence=1.0)

async def run_orchestration(message: str, context: list[dict]) -> dict:
    risk = assess_risk(message)

    if risk.risk_level in (RiskLevel.HIGH, RiskLevel.IMMEDIATE):
        emergency_msg = emergency_call_tool.invoke({})
        return {
            "response": _crisis_response() + "\n\n" + emergency_msg,
            "agent_used": "crisis_agent",
            "risk_level": risk.risk_level.value,
            "resources": crisis_resources(),
        }

    intent = _route_intent(message)
    if intent and intent.intent == "LOCATION_SEARCH":
        location = intent.location or _extract_location(message)
        query = intent.search_query or normalize_search_query(message)
        if not location or "near me" in location.lower() or "nearby" in location.lower():
            return {
                "response": (
                    f"I can help you find {query} near you. Could you share the city "
                    "or area you're looking in?"
                ),
                "agent_used": "location_search",
                "risk_level": risk.risk_level.value,
                "resources": [],
            }
        result = search_nearby_places(query, location)
        return {
            "response": _format_search_result(result, location),
            "agent_used": "location_search",
            "risk_level": risk.risk_level.value,
            "resources": result.get("resources", []),
        }

    agent = _build_agent()
    messages = []
    for msg in context[-20:]:
        messages.append((msg["role"], msg["content"]))
    messages.append(("user", message))

    try:
        result = agent.invoke({"messages": messages})

        tools_called = []
        final_response = ""

        for msg in result.get("messages", []):
            if isinstance(msg, AIMessage):
                if msg.content:
                    final_response = msg.content.strip()
                for tc in getattr(msg, "tool_calls", []) or []:
                    tools_called.append(tc.get("name", "unknown"))

        agent_used = "support"
        if "locate_therapist_tool" in tools_called:
            agent_used = "therapist"
        elif "search_nearby_places_tool" in tools_called:
            agent_used = "location_search"
        elif "ask_mental_health_specialist" in tools_called:
            agent_used = "support"

        return {
            "response": final_response or "I'm here to help. Could you tell me more about what you're experiencing?",
            "agent_used": agent_used,
            "risk_level": risk.risk_level.value,
            "resources": [],
        }
    except Exception:
        return {
            "response": "I'm experiencing a technical issue right now, but your feelings matter. Please try again in a moment.",
            "agent_used": "support",
            "risk_level": risk.risk_level.value,
            "resources": [],
        }

def _dump_resources(resources) -> list[dict]:
    out = []
    for r in resources or []:
        if isinstance(r, dict):
            out.append(r)
        elif hasattr(r, "model_dump"):
            out.append(r.model_dump())
        else:
            out.append(r)
    return out

async def stream_orchestration(message: str, context: list[dict]) -> AsyncGenerator[dict, None]:
    risk = assess_risk(message)

    if risk.risk_level in (RiskLevel.HIGH, RiskLevel.IMMEDIATE):
        emergency_msg = emergency_call_tool.invoke({})
        full_response = _crisis_response() + "\n\n" + emergency_msg
        yield {"type": "metadata", "agent_used": "crisis_agent", "risk_level": risk.risk_level.value}
        for i in range(0, len(full_response), 10):
            yield {"type": "token", "content": full_response[i:i+10]}
        yield {"type": "done"}
        return

    intent = _route_intent(message)
    if intent and intent.intent == "LOCATION_SEARCH":
        location = intent.location or _extract_location(message)
        query = intent.search_query or normalize_search_query(message)
        if not location or "near me" in location.lower() or "nearby" in location.lower():
            full_response = (
                f"I can help you find {query} near you. Could you share the city "
                "or area you're looking in?"
            )
            yield {"type": "metadata", "agent_used": "location_search", "risk_level": risk.risk_level.value}
            for i in range(0, len(full_response), 10):
                yield {"type": "token", "content": full_response[i:i+10]}
            yield {"type": "done"}
            return
        result = search_nearby_places(query, location)
        full_response = _format_search_result(result, location)
        yield {"type": "metadata", "agent_used": "location_search", "risk_level": risk.risk_level.value, "resources": _dump_resources(result.get("resources", []))}
        for i in range(0, len(full_response), 10):
            yield {"type": "token", "content": full_response[i:i+10]}
        yield {"type": "done"}
        return

    yield {"type": "metadata", "agent_used": "support", "risk_level": risk.risk_level.value}

    agent = _build_agent()
    messages = []
    for msg in context[-20:]:
        messages.append((msg["role"], msg["content"]))
    messages.append(("user", message))

    try:
        async for event in agent.astream(
            {"messages": messages},
            stream_mode="updates",
        ):
            for node, update in event.items():
                for msg in update.get("messages", []):
                    if isinstance(msg, AIMessage):
                        if msg.content:
                            yield {"type": "token", "content": msg.content}
                        for tc in getattr(msg, "tool_calls", []) or []:
                            tool_name = tc.get("name", "unknown")
                            tool_args = tc.get("args", {}) or {}
                            if tool_name == "locate_therapist_tool":
                                res = search_nearby_places("therapist", tool_args.get("location", ""))
                                yield {"type": "metadata", "agent_used": "therapist", "risk_level": "LOW", "resources": _dump_resources(res.get("resources", []))}
                            elif tool_name == "search_nearby_places_tool":
                                res = search_nearby_places(
                                    tool_args.get("query", ""),
                                    tool_args.get("location", ""),
                                )
                                yield {"type": "metadata", "agent_used": "location_search", "risk_level": "LOW", "resources": _dump_resources(res.get("resources", []))}
    except Exception:
        yield {"type": "token", "content": "I'm having a technical issue. Please try again."}

    yield {"type": "done"}
