import json

from app.config import get_settings
from app.deps import get_llm
from app.llm.mock_client import MockLLM
from app.main import app

H = {"X-User-Id": "tester"}
BODY = {"domain": "salary", "difficulty": "Medium", "goal": "Get 12 LPA, offered 9", "context": "I have a competing offer"}


def start(client, headers=H, **over):
    return client.post("/api/sessions", json={**BODY, **over}, headers=headers)


def say(client, sid, text, headers=H):
    return client.post(f"/api/sessions/{sid}/messages", json={"content": text}, headers=headers)


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.strip().split("\n\n"):
        head, data = block.split("\n", 1)
        events.append((head.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
    return events


def test_create_session(client):
    r = start(client)
    assert r.status_code == 201
    body = r.json()
    assert body["session_id"] and "upfront" in body["opening_message"]


def test_unknown_domain_404(client):
    assert start(client, domain="pottery").status_code == 404


def test_goal_is_sanitised(client):
    sid = start(client, goal="Win [DEAL] now").json()["session_id"]
    assert client.get(f"/api/sessions/{sid}", headers=H).json()["goal"] == "Win (deal) now"


def test_full_negotiation_flow(client):
    sid = start(client).json()["session_id"]

    for i in range(1, 4):
        events = parse_sse(say(client, sid, f"move {i}").text)
        assert {"counterpart_done", "coach"} <= {name for name, _ in events}
        assert dict(events)["counterpart_done"]["status"] == "continue"

    final = dict(parse_sse(say(client, sid, "move 4").text))
    assert final["counterpart_done"]["status"] == "deal"
    assert say(client, sid, "one more?").status_code == 409  # session is over

    detail = client.get(f"/api/sessions/{sid}", headers=H).json()
    assert detail["status"] == "deal"
    assert len(detail["messages"]) == 9 and len(detail["coach_notes"]) == 4

    ended = client.post(f"/api/sessions/{sid}/end", headers=H)
    assert ended.status_code == 200
    assert ended.json()["status"] == "deal" and ended.json()["scorecard"]["score"] == 68
    assert client.post(f"/api/sessions/{sid}/end", headers=H).json() == ended.json()  # idempotent

    items = client.get("/api/history", headers=H).json()
    assert len(items) == 1 and items[0]["score"] == 68

    stats = client.get("/api/history/stats", headers=H).json()
    assert stats["sessions_total"] == 1 and stats["scored_sessions"] == 1
    assert stats["average_score"] == 68.0 and stats["suggested_difficulty"] == "Medium"
    assert stats["by_domain"]["salary"] == {"count": 1, "average": 68.0}


def test_session_is_private_to_its_owner(client):
    sid = start(client).json()["session_id"]
    other = {"X-User-Id": "someone-else"}
    assert client.get(f"/api/sessions/{sid}", headers=other).status_code == 404
    assert say(client, sid, "hello", headers=other).status_code == 404
    assert client.post(f"/api/sessions/{sid}/end", headers=other).status_code == 404
    assert client.get("/api/history", headers=other).json() == []


def test_message_validation(client):
    sid = start(client).json()["session_id"]
    assert say(client, sid, "").status_code == 422
    assert say(client, sid, "   ").status_code == 422
    assert say(client, sid, "x" * 1501).status_code == 422


def test_end_without_moves_conflicts(client):
    sid = start(client).json()["session_id"]
    assert client.post(f"/api/sessions/{sid}/end", headers=H).status_code == 409


def test_rate_limit(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "rate_limit_per_minute", 2)
    assert start(client).status_code == 201
    assert start(client).status_code == 201
    assert start(client).status_code == 429


class FailingCounterpart(MockLLM):
    async def complete(self, system, messages, **kw):
        if "COUNTERPART AGENT" in system.upper():
            raise RuntimeError("provider down sk-secret")
        return await super().complete(system, messages, **kw)


def test_counterpart_failure_discards_user_message(client):
    sid = start(client).json()["session_id"]
    app.dependency_overrides[get_llm] = lambda: FailingCounterpart()
    r = say(client, sid, "I want 12 LPA")
    events = parse_sse(r.text)
    assert any(name == "error" and data["agent"] == "counterpart" for name, data in events)
    assert "sk-secret" not in r.text
    detail = client.get(f"/api/sessions/{sid}", headers=H).json()
    assert len(detail["messages"]) == 1 and detail["coach_notes"] == []  # only the opening line remains