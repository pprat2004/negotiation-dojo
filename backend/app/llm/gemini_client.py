"""Gemini provider using Google's official google-genai SDK."""
from collections.abc import AsyncIterator

from google import genai
from google.genai import types

from .base import ChatMessage, LLMClient, ensure_messages


def to_contents(messages: list[ChatMessage]) -> list[types.Content]:
    """Gemini calls the assistant role 'model'."""
    return [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part(text=m["content"])])
        for m in ensure_messages(messages)
    ]


class GeminiClient(LLMClient):
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        self._client = genai.Client(api_key=api_key)
        self.model = model

    def _config(self, system: str, max_tokens: int, temperature: float) -> types.GenerateContentConfig:
        kwargs: dict = {"system_instruction": system, "temperature": temperature}
        if "2.5" in self.model:
            # Gemini 2.5 "thinks" by default and thinking tokens count against the output limit,
            # which would truncate our short replies. Our prompts don't need it, so switch it off.
            kwargs["max_output_tokens"] = max_tokens
            kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
        else:
            # Newer models control thinking differently, so leave it at the default
            # and give the reply extra room so thinking cannot eat the whole budget.
            kwargs["max_output_tokens"] = max(max_tokens * 4, 1024)
        return types.GenerateContentConfig(**kwargs)

    async def complete(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> str:
        resp = await self._client.aio.models.generate_content(
            model=self.model,
            contents=to_contents(messages),
            config=self._config(system, max_tokens, temperature),
        )
        return resp.text or ""

    async def stream(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> AsyncIterator[str]:
        stream = await self._client.aio.models.generate_content_stream(
            model=self.model,
            contents=to_contents(messages),
            config=self._config(system, max_tokens, temperature),
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text