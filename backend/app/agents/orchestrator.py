"""Orchestrator: runs the agents for each phase of a negotiation.

It is deliberately pure (no database). Step 5's API loads history from the DB,
calls these methods, and saves what comes back.

    start()   -> Counterpart opens the negotiation
    turn()    -> Counterpart reply and Coach analysis run IN PARALLEL, events stream out
    debrief() -> Debrief Agent scores the finished transcript
"""
import asyncio
import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Literal

from app.llm.base import LLMClient
from app.models.schemas import CounterpartTurn, Scorecard

from .base import AgentOutputError, Msg, SessionContext, sanitize_user_text
from .coach import CoachAgent
from .counterpart import CounterpartAgent
from .debrief import DebriefAgent

log = logging.getLogger("dojo.orchestrator")


@dataclass
class Event:
    """One streamed event. type: counterpart_token | counterpart_done | coach | error"""

    type: str
    data: dict = field(default_factory=dict)

    def sse(self) -> str:
        return f"event: {self.type}\ndata: {json.dumps(self.data, ensure_ascii=False)}\n\n"


def _public_message(exc: Exception) -> str:
    """Never leak provider internals (keys, URLs, stack traces) to the browser."""
    if isinstance(exc, AgentOutputError):
        return "The AI returned an unusable answer. Please try again."
    return "The AI provider had a problem. Please try again."


class Orchestrator:
    def __init__(self, llm: LLMClient):
        self.counterpart = CounterpartAgent(llm)
        self.coach = CoachAgent(llm)
        self.debrief_agent = DebriefAgent(llm)

    async def start(self, ctx: SessionContext) -> CounterpartTurn:
        return await self.counterpart.open(ctx)

    async def turn(self, ctx: SessionContext, history: list[Msg], user_message: str) -> AsyncIterator[Event]:
        """`history` is everything BEFORE this user message."""
        clean = sanitize_user_text(user_message)
        if not clean:
            yield Event("error", {"agent": "orchestrator", "message": "Message is empty."})
            return

        queue: asyncio.Queue = asyncio.Queue()

        async def run_counterpart() -> None:
            try:
                async for item in self.counterpart.stream_reply(ctx, history, clean):
                    if isinstance(item, CounterpartTurn):
                        await queue.put(Event("counterpart_done", {"text": item.text, "status": item.status}))
                    else:
                        await queue.put(Event("counterpart_token", {"text": item}))
            except Exception as exc:
                log.exception("counterpart failed")
                await queue.put(Event("error", {"agent": "counterpart", "message": _public_message(exc)}))
            finally:
                await queue.put(None)

        async def run_coach() -> None:
            try:
                feedback = await self.coach.analyse(ctx, history, clean)
                await queue.put(Event("coach", feedback.model_dump()))
            except Exception as exc:  # a coach failure must never block the negotiation
                log.exception("coach failed")
                await queue.put(Event("error", {"agent": "coach", "message": _public_message(exc)}))
            finally:
                await queue.put(None)

        tasks = [asyncio.create_task(run_counterpart()), asyncio.create_task(run_coach())]
        try:
            finished = 0
            while finished < len(tasks):
                event = await queue.get()
                if event is None:
                    finished += 1
                else:
                    yield event
        finally:  # runs on client disconnect too, so nothing keeps calling the LLM
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def debrief(
        self, ctx: SessionContext, history: list[Msg], status: Literal["deal", "walkaway", "ended"] = "ended"
    ) -> Scorecard:
        return await self.debrief_agent.evaluate(ctx, history, status)