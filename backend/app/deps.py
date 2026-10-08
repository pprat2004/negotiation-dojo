"""FastAPI dependencies shared by all routers."""
import time
from collections import defaultdict, deque
from collections.abc import Iterator

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app.agents.orchestrator import Orchestrator
from app.config import get_settings
from app.llm import get_llm_client
from app.llm.base import LLMClient
from app.models.db import SessionLocal


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session_factory() -> sessionmaker:
    """The SSE endpoint opens short-lived sessions of its own, because a request-scoped
    session may be closed before a streaming response finishes."""
    return SessionLocal


def get_llm() -> LLMClient:
    try:
        return get_llm_client()
    except (RuntimeError, ValueError) as exc:  # missing key or unknown provider
        raise HTTPException(status_code=503, detail=str(exc))


def get_orchestrator(llm: LLMClient = Depends(get_llm)) -> Orchestrator:
    return Orchestrator(llm)


def get_user_id(x_user_id: str = Header(default="anonymous")) -> str:
    """Anonymous per-browser id sent by the frontend (no login needed)."""
    return (x_user_id.strip() or "anonymous")[:64]


# ---- basic in-memory rate limit (per user, sliding 60 s window; fine for one process)
_hits: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(user_id: str = Depends(get_user_id)) -> str:
    """Use on write endpoints. Returns the user id so routes can depend on it directly."""
    limit = get_settings().rate_limit_per_minute
    now = time.monotonic()
    window = _hits[user_id]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Slow down a little.", headers={"Retry-After": "60"})
    window.append(now)
    return user_id