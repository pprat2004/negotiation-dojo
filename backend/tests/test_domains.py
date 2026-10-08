import pytest

from app.domains.loader import get_domain, list_domains


def test_loads_three_domains_in_order():
    assert [d.id for d in list_domains()] == ["salary", "insurance", "rent"]


def test_unknown_domain_raises():
    with pytest.raises(KeyError):
        get_domain("pottery")


def test_public_hides_internal_fields():
    pub = get_domain("salary").public()
    assert "knowledge_file" not in pub and "opening_hint" not in pub
    assert pub["default_goal"]