"""Loads and validates domain configs from the JSON files in this folder.

To add a new domain: drop <id>.json here (id must match the filename) and a
tactics file in app/knowledge/. No code changes needed.
"""
import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

DOMAINS_DIR = Path(__file__).parent


class Domain(BaseModel):
    id: str
    order: int = 99
    label: str
    emoji: str = ""
    counterpart_role: str
    user_role: str
    default_goal: str
    default_context: str = ""
    opening_hint: str = ""
    knowledge_file: str

    def public(self) -> dict:
        """What the frontend may see (hides prompt-internal fields)."""
        return self.model_dump(exclude={"knowledge_file", "opening_hint"})


@lru_cache
def load_domains() -> dict[str, Domain]:
    domains: dict[str, Domain] = {}
    for path in sorted(DOMAINS_DIR.glob("*.json")):
        domain = Domain(**json.loads(path.read_text(encoding="utf-8")))
        if domain.id != path.stem:
            raise ValueError(f"{path.name}: id '{domain.id}' must match the filename")
        domains[domain.id] = domain
    return dict(sorted(domains.items(), key=lambda kv: kv[1].order))


def list_domains() -> list[Domain]:
    return list(load_domains().values())


def get_domain(domain_id: str) -> Domain:
    try:
        return load_domains()[domain_id]
    except KeyError:
        raise KeyError(f"Unknown domain '{domain_id}'. Available: {', '.join(load_domains())}")