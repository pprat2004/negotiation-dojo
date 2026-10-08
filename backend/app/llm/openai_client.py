from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from .base import ChatMessage, LLMClient, ensure_messages


class OpenAIClient(LLMClient):
    """Works with OpenAI and any OpenAI-compatible server via OPENAI_BASE_URL."""

    name = "openai"

    def __init__(self, api_key: str, model: str, base_url: str = ""):
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url or None)
        self.model = model

    def _payload(self, system: str, messages: list[ChatMessage]) -> list[dict]:
        return [{"role": "system", "content": system}, *ensure_messages(messages)]

    async def complete(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> str:
        r = await self._client.chat.completions.create(
            model=self.model,
            messages=self._payload(system, messages),
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return r.choices[0].message.content or ""

    async def stream(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> AsyncIterator[str]:
        s = await self._client.chat.completions.create(
            model=self.model,
            messages=self._payload(system, messages),
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )
        async for chunk in s:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content