import pytest

from app.knowledge.retriever import format_for_prompt, load_tactics, retrieve


def test_relevant_tactic_ranked_first():
    top = retrieve("salary", "can I have more time to decide before the deadline", k=3)[0]
    assert top.title == "Exploding offer"


def test_empty_query_falls_back_to_core():
    result = retrieve("rent", "", k=3)
    assert len(result) == 3 and all(t.core for t in result)


def test_every_domain_has_enough_tactics():
    for d in ("salary", "insurance", "rent"):
        assert len(load_tactics(d)) >= 6


def test_unknown_domain_raises():
    with pytest.raises(KeyError):
        retrieve("pottery", "hello")


def test_format_for_prompt():
    block = format_for_prompt(retrieve("insurance", "depreciation on my laptop", k=2))
    assert block.startswith("TACTICS YOU MAY USE") and "Depreciation" in block