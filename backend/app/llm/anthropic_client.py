from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from .base import ChatMessage, LLMClient, ensure_messages


class AnthropicClient(LLMClient):
    name = "anthropic"

    def __init__(self, api_key: str, model: str):
        self._client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def complete(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> str:
        resp = await self._client.messages.create(
            model=self.model,
            system=system,
            messages=ensure_messages(messages),
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return "".join(b.text for b in resp.content if b.type == "text")

    async def stream(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> AsyncIterator[str]:
        async with self._client.messages.stream(
            model=self.model,
            system=system,
            messages=ensure_messages(messages),
            max_tokens=max_tokens,
            temperature=temperature,
        ) as s:
            async for text in s.text_stream:
                yield text