"""LLM factory: pick the provider from LLM_PROVIDER."""
from functools import lru_cache

from app.config import get_settings

from .base import LLMClient


@lru_cache
def get_llm_client() -> LLMClient:
    s = get_settings()
    provider = s.llm_provider.lower()

    if provider == "anthropic":
        if not s.anthropic_api_key:
            raise RuntimeError("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set")
        from .anthropic_client import AnthropicClient

        return AnthropicClient(s.anthropic_api_key, s.resolved_model)

    if provider == "openai":
        if not s.openai_api_key:
            raise RuntimeError("LLM_PROVIDER=openai but OPENAI_API_KEY is not set")
        from .openai_client import OpenAIClient

        return OpenAIClient(s.openai_api_key, s.resolved_model, s.openai_base_url)


    if provider == "gemini":
        if not s.gemini_api_key:
            raise RuntimeError("LLM_PROVIDER=gemini but GEMINI_API_KEY is not set")
        from .gemini_client import GeminiClient

        return GeminiClient(s.gemini_api_key, s.resolved_model)

    if provider == "mock":
        from .mock_client import MockLLM

        return MockLLM()

    raise ValueError(f"Unknown LLM_PROVIDER '{s.llm_provider}'. Use mock, anthropic, openai or gemini.")