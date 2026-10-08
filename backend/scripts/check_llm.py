"""Live check of the configured LLM.  Run from backend/:  python -m scripts.check_llm"""
import asyncio

from app.agents.base import Msg, SessionContext
from app.agents.orchestrator import Orchestrator
from app.config import get_settings
from app.domains.loader import list_domains
from app.llm import get_llm_client


async def main() -> None:
    s = get_settings()
    print(f"Provider: {s.llm_provider} | model: {s.resolved_model}\n")
    orch = Orchestrator(get_llm_client())

    for d in list_domains():
        ctx = SessionContext(d.id, "Medium", d.default_goal, d.default_context)
        opening = await orch.start(ctx)
        print(f"[{d.id}] opening: {opening.text}")

        history = [Msg("counterpart", opening.text)]
        events = [e async for e in orch.turn(ctx, history, "That's below what I was hoping for. What flexibility do you have?")]
        done = next((e for e in events if e.type == "counterpart_done"), None)
        coach = next((e for e in events if e.type == "coach"), None)
        errors = [e.data for e in events if e.type == "error"]
        print(f"[{d.id}] reply:   {done.data['text'] if done else 'MISSING'}")
        print(f"[{d.id}] coach:   {coach.data['rating']}/10 - {coach.data['better_phrasing'] if coach else 'MISSING'}")
        if errors:
            print(f"[{d.id}] ERRORS: {errors}")
        print()

    card = await orch.debrief(ctx, [*history, Msg("user", "That's below what I hoped for."), Msg("counterpart", done.data["text"])], "ended")
    print(f"Debrief OK, score {card.score}: {card.verdict}")


asyncio.run(main())