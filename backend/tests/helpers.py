import json

from app.llm.base import LLMClient


class ScriptedLLM(LLMClient):
    """Returns queued replies in order and records every call (for repair and prompt tests)."""

    name = "scripted"
    model = "scripted"

    def __init__(self, replies: list[str]):
        self.replies = list(replies)
        self.calls: list[tuple[str, list]] = []

    async def complete(self, system, messages, *, max_tokens=600, temperature=0.7):
        self.calls.append((system, list(messages)))
        return self.replies.pop(0)


GOOD_COACH = json.dumps(
    {
        "rating": 7,
        "issue": "none",
        "better_phrasing": "I can commit today at 12 LPA.",
        "unused_leverage": "Competing offer.",
        "tactic_detected": "anchoring",
    }
)