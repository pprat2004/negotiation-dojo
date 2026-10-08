"""Offline LLM for demos and tests. No API key, deterministic output.

Convention (the real agents in step 4 must follow it): each agent's system prompt
contains its name in caps: "COUNTERPART AGENT", "COACH AGENT" or "DEBRIEF AGENT".
The Counterpart ends its final line with [DEAL] or [WALKAWAY] when talks conclude.
"""
import asyncio
import json
from collections.abc import AsyncIterator

from .base import ChatMessage, LLMClient

COUNTER_LINES = [
    "Thanks for making time. To be upfront, the figure on the table is close to our limit, and it's below what you're after.",
    "I hear you, but we have other options in the pipeline. What exactly justifies that number?",
    "I can move a little, but I'll need something concrete to take back to my side. What else can you offer?",
    "Alright, I can stretch to a middle ground. Do we have a deal?",
]

COACH = {
    "rating": 6,
    "issue": "You made a concession without asking for anything in return.",
    "better_phrasing": "\"I can be flexible on timing if we can close the gap on the main number.\"",
    "unused_leverage": "Bring up your competing option or market data.",
    "tactic_detected": "anchoring",
}

DEBRIEF = {
    "score": 68,
    "verdict": "Solid start, but you conceded early and left leverage unused.",
    "dimensions": {"preparation": 7, "assertiveness": 6, "concessions": 5, "leverage_use": 6, "outcome": 7},
    "leverage_used": ["Cited your experience"],
    "opportunities_missed": ["Never mentioned a competing offer", "Accepted the first anchor without countering"],
    "rewrites": [{"said": "Okay, that works I guess.", "better": "That's close. If you can improve the main figure, I can commit today."}],
    "next_steps": ["Open with a specific number", "Trade every concession for something in return"],
}


class MockLLM(LLMClient):
    name = "mock"
    model = "mock"

    async def complete(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> str:
        s = system.upper()
        if "COACH AGENT" in s:
            return json.dumps(COACH)
        if "DEBRIEF AGENT" in s:
            return json.dumps(DEBRIEF)
        n = sum(1 for m in messages if m["role"] == "user" and m["content"].strip() != "Begin.")
        if n >= len(COUNTER_LINES):
            return "Deal. I'll put that in writing today. [DEAL]"
        return COUNTER_LINES[n]

    async def stream(
        self, system: str, messages: list[ChatMessage], *, max_tokens: int = 600, temperature: float = 0.7
    ) -> AsyncIterator[str]:
        text = await self.complete(system, messages)
        for word in text.split(" "):
            await asyncio.sleep(0.02)
            yield word + " "