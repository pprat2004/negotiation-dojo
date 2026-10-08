"""Shared agent plumbing: session types, input guard, transcript helpers, JSON repair."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Literal, TypeVar

from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.llm.base import ChatMessage, LLMClient

log = logging.getLogger("dojo.agents")
M = TypeVar("M", bound=BaseModel)


class AgentOutputError(Exception):
    """An agent produced output we could not use, even after repair attempts."""


@dataclass(frozen=True)
class SessionContext:
    """Everything the agents need to know about a session (built from DB rows in step 5)."""

    domain_id: str
    difficulty: str
    goal: str
    context: str = ""


@dataclass(frozen=True)
class Msg:
    role: Literal["user", "counterpart"]
    content: str


# ---------------------------------------------------------------- input guard
_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
_DEAL_TAGS = re.compile(r"\[(?:DEAL|WALKAWAY)\]", re.I)
_FENCE_TAGS = re.compile(r"</?\s*transcript\s*>", re.I)

_INJECTION = re.compile(
    "|".join(
        [
            r"ignore\s+(?:all\s+|any\s+|your\s+|the\s+)*(?:previous|prior|above|earlier)?\s*(?:instructions|prompts?|rules)",
            r"forget\s+(?:everything|your\s+(?:role|instructions|rules))",
            r"(?:reveal|show|print|repeat|tell\s+me)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules)",
            r"\byou\s+are\s+(?:now|no\s+longer)\b",
            r"\b(?:pretend|act)\s+(?:to\s+be|as\s+if\s+you\s+are|you\s+are)\b",
            r"\bsystem\s+prompt\b",
            r"\bjailbreak\b",
            r"\bdeveloper\s+mode\b",
        ]
    ),
    re.I,
)

LEAK_MARKERS = ("tactics you may use", "counterpart agent", "system prompt", "negotiation dojo")


def sanitize_user_text(text: str, max_chars: int | None = None) -> str:
    """Clean untrusted user text. Idempotent, so calling it twice is harmless.

    - drops control characters
    - neutralises our own control tags ([DEAL]/[WALKAWAY]) so users cannot fake outcomes
    - removes <transcript> tags so users cannot break out of the data block
    - enforces the length limit
    """
    limit = max_chars or get_settings().max_message_chars
    text = _CONTROL.sub("", text)
    text = _DEAL_TAGS.sub(lambda m: "(" + m.group(0)[1:-1].lower() + ")", text)
    text = _FENCE_TAGS.sub("", text)
    return text.strip()[:limit]


def looks_like_injection(text: str) -> bool:
    return bool(_INJECTION.search(text))


def leaks_prompt(text: str) -> bool:
    low = text.lower()
    return any(marker in low for marker in LEAK_MARKERS)


# ---------------------------------------------------------- transcript helpers
def format_transcript(history: list[Msg]) -> str:
    return "\n".join(
        f"{'USER' if m.role == 'user' else 'COUNTERPART'}: {_FENCE_TAGS.sub('', m.content)}" for m in history
    )


def to_chat_messages(history: list[Msg]) -> list[ChatMessage]:
    """Map history to provider messages. Providers need the first turn to be 'user',
    so a neutral 'Begin.' is prepended when the Counterpart spoke first."""
    msgs: list[ChatMessage] = [
        {"role": "user" if m.role == "user" else "assistant", "content": m.content} for m in history
    ]
    if msgs and msgs[0]["role"] == "assistant":
        msgs.insert(0, {"role": "user", "content": "Begin."})
    return msgs


# ------------------------------------------------------------------ JSON repair
def extract_json(raw: str) -> dict:
    """Pull the first JSON object out of a reply (tolerates ``` fences and chatter)."""
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object found in reply")
    return json.loads(raw[start : end + 1])


def _short(err: Exception | None) -> str:
    return str(err)[:300] if err else ""


class Agent:
    """Base class: holds the LLM client and offers validated-JSON completion."""

    name = "agent"

    def __init__(self, llm: LLMClient):
        self.llm = llm

    async def complete_json(
        self,
        system: str,
        messages: list[ChatMessage],
        model_cls: type[M],
        *,
        max_tokens: int = 600,
        temperature: float = 0.3,
        retries: int = 2,
    ) -> M:
        """Ask for JSON, validate with Pydantic, and on failure show the model its
        own bad output plus the error and ask for a corrected version."""
        msgs = list(messages)
        last_err: Exception | None = None
        for attempt in range(retries + 1):
            raw = await self.llm.complete(system, msgs, max_tokens=max_tokens, temperature=temperature)
            try:
                return model_cls.model_validate(extract_json(raw))
            except (ValueError, ValidationError) as err:
                last_err = err
                log.warning("%s: invalid JSON (attempt %d/%d): %s", self.name, attempt + 1, retries + 1, _short(err))
                msgs = [
                    *msgs,
                    {"role": "assistant", "content": raw or "(empty)"},
                    {
                        "role": "user",
                        "content": f"That reply was invalid: {_short(err)}. "
                        "Reply again with ONLY the corrected JSON object, no markdown, no commentary.",
                    },
                ]
        raise AgentOutputError(
            f"{self.name} returned invalid JSON after {retries + 1} attempts: {_short(last_err)}"
        )