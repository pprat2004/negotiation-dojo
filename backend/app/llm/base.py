"""Provider-agnostic LLM interface. Agents only ever talk to this."""
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Literal, TypedDict


class ChatMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str


def ensure_messages(messages: list[ChatMessage]) -> list[ChatMessage]:
    """Providers need at least one user turn; use a neutral opener when empty."""
    return list(messages) if messages else [{"role": "user", "content": "Begin."}]


class LLMClient(ABC):
    name: str = "base"
    model: str = ""

    @abstractmethod
    async def complete(
        self,
        system: str,
        messages: list[ChatMessage],
        *,
        max_tokens: int = 600,
        temperature: float = 0.7,
    ) -> str:
        """Return the full reply text."""

    async def stream(
        self,
        system: str,
        messages: list[ChatMessage],
        *,
        max_tokens: int = 600,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Yield text chunks. Default: one chunk; providers override for real streaming."""
        yield await self.complete(system, messages, max_tokens=max_tokens, temperature=temperature)