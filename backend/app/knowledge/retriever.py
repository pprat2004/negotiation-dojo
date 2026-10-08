"""Tiny keyword retriever for the tactics knowledge base.

Why not a vector DB? The knowledge base is ~25 short documents; keyword matching
is transparent, deterministic, free and easy to explain. The `retrieve` signature
stays the same if you swap in embeddings later.
"""
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.domains.loader import get_domain

KNOWLEDGE_DIR = Path(__file__).parent
STOPWORDS = {
    "the", "and", "for", "you", "your", "can", "with", "that", "this", "have", "are", "but",
    "not", "will", "would", "about", "what", "from", "need", "more", "just", "like", "them",
    "they", "their", "than", "then", "into", "when", "where", "which", "was", "has", "had",
}


@dataclass(frozen=True)
class Tactic:
    title: str
    tags: frozenset[str]
    body: str
    core: bool = False


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z]{3,}", text.lower()) if t not in STOPWORDS}


def _parse(text: str) -> list[Tactic]:
    tactics: list[Tactic] = []
    for chunk in re.split(r"^## ", text, flags=re.MULTILINE)[1:]:
        title, _, rest = chunk.partition("\n")
        tags: set[str] = set()
        core = False
        body_lines: list[str] = []
        for line in rest.strip().splitlines():
            if line.lower().startswith("tags:"):
                raw = {t.strip().lower() for t in line.split(":", 1)[1].split(",") if t.strip()}
                core = "core" in raw
                tags = raw - {"core"}
            else:
                body_lines.append(line)
        tactics.append(Tactic(title.strip(), frozenset(tags), " ".join(body_lines).strip(), core))
    return tactics


@lru_cache
def load_tactics(domain_id: str) -> tuple[Tactic, ...]:
    path = KNOWLEDGE_DIR / get_domain(domain_id).knowledge_file
    return tuple(_parse(path.read_text(encoding="utf-8")))


def retrieve(domain_id: str, query: str = "", k: int = 3) -> list[Tactic]:
    """Return the k most relevant tactics for `query` (e.g. the user's latest message).

    Score = 2 per matching tag + 1 per matching body word. Ties and zero-score
    results fall back to `core` tactics, then file order, so the Counterpart
    always has something sensible to use.
    """
    tactics = load_tactics(domain_id)
    q = _tokens(query)

    def score(t: Tactic) -> int:
        return 2 * len(t.tags & q) + len(_tokens(t.body) & q)

    ranked = sorted(enumerate(tactics), key=lambda it: (-score(it[1]), not it[1].core, it[0]))
    return [t for _, t in ranked[:k]]


def format_for_prompt(tactics: list[Tactic]) -> str:
    """Render tactics as a block to paste into the Counterpart system prompt."""
    lines = ["TACTICS YOU MAY USE (choose what fits the moment; never list them all):"]
    lines += [f"- {t.title}: {t.body}" for t in tactics]
    return "\n".join(lines)