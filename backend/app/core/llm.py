from langchain_core.language_models.chat_models import BaseChatModel
from app.core.config import settings

def get_chat_model(model: str = "", temperature: float = 0.7, max_tokens: int = 600) -> BaseChatModel:
    if settings.NVIDIA_API_KEY:
        from langchain_openai import ChatOpenAI
        kwargs = {
            "model": settings.NVIDIA_MODEL,
            "base_url": settings.NVIDIA_BASE_URL,
            "api_key": settings.NVIDIA_API_KEY,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if settings.NVIDIA_ENABLE_THINKING:
            kwargs["model_kwargs"] = {
                "chat_template_kwargs": {"enable_thinking": True},
                "reasoning_budget": settings.NVIDIA_REASONING_BUDGET,
            }
        return ChatOpenAI(**kwargs)

    from langchain_groq import ChatGroq
    return ChatGroq(
        model=model or settings.LLM_MODEL,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=settings.GROQ_API_KEY,
    )

def has_chat_model() -> bool:
    return bool(settings.NVIDIA_API_KEY or settings.GROQ_API_KEY)