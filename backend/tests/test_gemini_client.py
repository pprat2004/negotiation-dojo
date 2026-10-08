import pytest

from app.config import get_settings
from app.llm import get_llm_client
from app.llm.gemini_client import GeminiClient, to_contents


def test_to_contents_maps_roles():
    out = to_contents([{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}])
    assert [c.role for c in out] == ["user", "model"]


def test_to_contents_never_empty():
    assert to_contents([])[0].parts[0].text == "Begin."


def test_factory_requires_key(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "llm_provider", "gemini")
    monkeypatch.setattr(s, "gemini_api_key", "")
    get_llm_client.cache_clear()
    with pytest.raises(RuntimeError):
        get_llm_client()
    get_llm_client.cache_clear()


def test_factory_builds_client(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "llm_provider", "gemini")
    monkeypatch.setattr(s, "gemini_api_key", "fake-key-for-test")
    get_llm_client.cache_clear()
    assert isinstance(get_llm_client(), GeminiClient)
    get_llm_client.cache_clear()