from fastapi.testclient import TestClient

from app.main import app


def test_list_domains():
    with TestClient(app) as client:
        r = client.get("/api/domains")
    assert r.status_code == 200
    data = r.json()
    assert [d["id"] for d in data] == ["salary", "insurance", "rent"]
    assert "knowledge_file" not in data[0]