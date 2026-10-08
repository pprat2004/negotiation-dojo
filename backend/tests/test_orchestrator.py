from app.agents.base import Msg, SessionContext
from app.agents.orchestrator import Event, Orchestrator
from app.llm.mock_client import MockLLM

CTX = SessionContext("salary", "Medium", "Get 12 LPA, offered 9", "I have a competing offer")


def hist(n_user: int) -> list[Msg]:
    h = [Msg("counterpart", "Opening line.")]
    for i in range(n_user):
        h += [Msg("user", f"move {i}"), Msg("counterpart", "reply")]
    return h


async def collect(orch: Orchestrator, history: list[Msg], text: str) -> list[Event]:
    return [e async for e in orch.turn(CTX, history, text)]


async def test_start_returns_opening():
    turn = await Orchestrator(MockLLM()).start(CTX)
    assert turn.status == "continue" and "upfront" in turn.text


async def test_turn_streams_counterpart_and_coach():
    events = await collect(Orchestrator(MockLLM()), [], "I would like 12 LPA")
    types = {e.type for e in events}
    assert {"counterpart_token", "counterpart_done", "coach"} <= types
    tokens = "".join(e.data["text"] for e in events if e.type == "counterpart_token")
    done = next(e for e in events if e.type == "counterpart_done")
    assert tokens.strip() == done.data["text"]
    assert next(e for e in events if e.type == "coach").data["rating"] == 6


async def test_deal_status_and_clean_stream():
    events = await collect(Orchestrator(MockLLM()), hist(3), "Okay, 11 LPA and we have a deal")
    done = next(e for e in events if e.type == "counterpart_done")
    assert done.data["status"] == "deal"
    assert done.data["text"].endswith("today.")
    streamed = "".join(e.data["text"] for e in events if e.type == "counterpart_token")
    assert "[DEAL]" not in streamed


async def test_coach_failure_is_isolated():
    class FailingCoach(MockLLM):
        async def complete(self, system, messages, **kw):
            if "COACH AGENT" in system.upper():
                raise RuntimeError("boom secret-key")
            return await super().complete(system, messages, **kw)

    events = await collect(Orchestrator(FailingCoach()), [], "hello there")
    err = next(e for e in events if e.type == "error")
    assert err.data["agent"] == "coach" and "boom" not in err.data["message"]
    assert any(e.type == "counterpart_done" for e in events)


async def test_empty_message_rejected():
    events = await collect(Orchestrator(MockLLM()), [], "\x00   ")
    assert [e.type for e in events] == ["error"]
    assert events[0].data["agent"] == "orchestrator"


async def test_debrief_scorecard():
    card = await Orchestrator(MockLLM()).debrief(CTX, hist(2), "deal")
    assert card.score == 68 and card.dimensions.outcome == 7


def test_event_sse_format():
    assert Event("coach", {"a": 1}).sse() == 'event: coach\ndata: {"a": 1}\n\n'