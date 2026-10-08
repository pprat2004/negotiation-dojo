"""Central, env-driven settings. Every other module reads config from here."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_provider: str = "mock"  # mock | anthropic | openai
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openai_base_url: str = ""  # optional: any OpenAI-compatible endpoint
    model_name: str = ""  # blank = sensible default per provider
    gemini_api_key: str = ""
    database_url: str = "sqlite:///./dojo.db"
    cors_origin: str = "http://localhost:5173"  # comma-separated list allowed
    max_message_chars: int = 1500
    max_rounds_per_session: int = 30   # caps LLM cost per negotiation
    rate_limit_per_minute: int = 30

    @property
    def resolved_model(self) -> str:
        if self.model_name:
            return self.model_name
        defaults = {"anthropic": "claude-sonnet-5-5", "openai": "gpt-4o-mini", "gemini": "gemini-3.7-flash"}
        return defaults.get(self.llm_provider.lower(), "mock")


@lru_cache
def get_settings() -> Settings:
    return Settings()