import json

from app.llm.mock_client import MockLLM


async def test_counterpart_opens_without_messages():
    out = await MockLLM().complete("You are the COUNTERPART AGENT", [])
    assert "upfront" in out


async def test_counterpart_reaches_deal():
    msgs = [{"role": "user", "content": f"move {i}"} for i in range(4)]
    out = await MockLLM().complete("You are the COUNTERPART AGENT", msgs)
    assert out.endswith("[DEAL]")


async def test_coach_returns_valid_json():
    from app.models.schemas import CoachFeedback

    raw = await MockLLM().complete("You are the COACH AGENT", [{"role": "user", "content": "hi"}])
    assert CoachFeedback(**json.loads(raw)).rating == 6


async def test_debrief_returns_valid_json():
    from app.models.schemas import Scorecard

    raw = await MockLLM().complete("You are the DEBRIEF AGENT", [{"role": "user", "content": "x"}])
    assert Scorecard(**json.loads(raw)).score == 68


async def test_stream_matches_complete():
    chunks = [c async for c in MockLLM().stream("You are the COUNTERPART AGENT", [])]
    assert "".join(chunks).strip() == await MockLLM().complete("You are the COUNTERPART AGENT", [])