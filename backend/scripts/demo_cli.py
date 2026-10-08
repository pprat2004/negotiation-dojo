"""Play a full negotiation in the terminal.  Run from backend/:  python -m scripts.demo_cli

Uses whatever LLM_PROVIDER is set in .env (mock works with no key).
"""
import asyncio
import json

from app.agents.base import Msg, SessionContext, sanitize_user_text
from app.agents.orchestrator import Orchestrator
from app.domains.loader import get_domain
from app.llm import get_llm_client


async def main() -> None:
    domain = input("Domain [salary/insurance/rent] (salary): ").strip() or "salary"
    difficulty = input("Difficulty [Easy/Medium/Hard] (Medium): ").strip() or "Medium"
    d = get_domain(domain)
    ctx = SessionContext(domain, difficulty, d.default_goal, d.default_context)
    orch = Orchestrator(get_llm_client())

    opening = await orch.start(ctx)
    history = [Msg("counterpart", opening.text)]
    print(f"\nCounterpart: {opening.text}\n")
    status = "ended"

    while status == "continue" or not history[1:]:
        user = sanitize_user_text(input("You (blank to finish): "))
        if not user:
            break
        reply, coach = None, None
        print("Counterpart: ", end="", flush=True)
        async for ev in orch.turn(ctx, history, user):
            if ev.type == "counterpart_token":
                print(ev.data["text"], end="", flush=True)
            elif ev.type == "counterpart_done":
                reply, status = ev.data["text"], ev.data["status"]
            elif ev.type == "coach":
                coach = ev.data
            elif ev.type == "error":
                print(f"\n[{ev.data['agent']} error] {ev.data['message']}")
        print()
        if coach:
            print(f"  Coach {coach['rating']}/10 | issue: {coach['issue']}\n  try: {coach['better_phrasing']}\n")
        history.append(Msg("user", user))
        if reply:
            history.append(Msg("counterpart", reply))
        if status in ("deal", "walkaway"):
            print(f"*** {status.upper()} ***")
            break

    if sum(m.role == "user" for m in history) >= 1:
        card = await orch.debrief(ctx, history, status if status in ("deal", "walkaway") else "ended")
        print("\nSCORECARD\n" + json.dumps(card.model_dump(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())