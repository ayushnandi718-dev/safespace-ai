from typing import AsyncGenerator
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import AIMessage
from app.agents.risk_assessment import assess_risk, RiskLevel
from app.agents.tools import ask_mental_health_specialist, locate_therapist_tool, emergency_call_tool
from app.core.config import settings

SYSTEM_PROMPT = """\
You are SafeSpace AI, a warm and empathetic AI mental-wellness support companion.
You are NOT a licensed therapist, psychologist, doctor, or medical professional.\
 You do NOT diagnose conditions, prescribe treatment, or replace professional care.

You have access to three tools:
1. ask_mental_health_specialist — use for emotional support, stress, anxiety, \
   coping strategies, and general psychological guidance.
2. locate_therapist_tool — use when the user asks for therapists, counselors, \
   psychologists, or nearby professional mental-health resources.
3. emergency_call_tool — use ONLY when the user expresses immediate danger, \
   credible self-harm intent, suicidal intent, or another clear crisis situation.

Always:
- Respond kindly, clearly, and with empathy.
- Respect uncertainty and never fabricate diagnoses.
- If a user may be in immediate danger, prioritize safety over everything else.
- In crisis situations, encourage contacting local emergency services and a \
  trusted person nearby.
- Never claim a real emergency call was placed when the system is in simulation mode.
- Encourage professional help when appropriate.
"""

CRISIS_RESPONSE = (
    "I hear you, and I want you to know that what you're feeling matters. "
    "You don't have to go through this alone.\n\n"
    "If you are in immediate danger, please call your local emergency "
    "number right now — 911 in the US, 112 in the EU, or 100 in India.\n\n"
    "You can also reach out to:\n"
    "• National Suicide & Crisis Lifeline (US): 988\n"
    "• Crisis Text Line: text HOME to 741741\n"
    "• A trusted friend, family member, or counselor nearby.\n\n"
    "Are you in immediate danger right now? I want to make sure you're safe."
)

TOOLS = [ask_mental_health_specialist, locate_therapist_tool, emergency_call_tool]

def _get_llm():
    return ChatGroq(
        model=settings.LLM_MODEL,
        temperature=0.7,
        max_tokens=600,
        api_key=settings.GROQ_API_KEY,
    )

def _build_agent():
    return create_react_agent(
        _get_llm(),
        tools=TOOLS,
        prompt=SYSTEM_PROMPT,
    )

async def run_orchestration(message: str, context: list[dict]) -> dict:
    risk = assess_risk(message)

    if risk.risk_level in (RiskLevel.HIGH, RiskLevel.IMMEDIATE):
        emergency_msg = emergency_call_tool.invoke({})
        return {
            "response": CRISIS_RESPONSE + "\n\n" + emergency_msg,
            "agent_used": "crisis_agent",
            "risk_level": risk.risk_level.value,
            "resources": ["988 Suicide & Crisis Lifeline", "Crisis Text Line: 741741"],
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

async def stream_orchestration(message: str, context: list[dict]) -> AsyncGenerator[dict, None]:
    risk = assess_risk(message)

    if risk.risk_level in (RiskLevel.HIGH, RiskLevel.IMMEDIATE):
        emergency_msg = emergency_call_tool.invoke({})
        full_response = CRISIS_RESPONSE + "\n\n" + emergency_msg
        yield {"type": "metadata", "agent_used": "crisis_agent", "risk_level": risk.risk_level.value}
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
                            if tool_name == "locate_therapist_tool":
                                yield {"type": "metadata", "agent_used": "therapist", "risk_level": "LOW"}
    except Exception:
        yield {"type": "token", "content": "I'm having a technical issue. Please try again."}

    yield {"type": "done"}
