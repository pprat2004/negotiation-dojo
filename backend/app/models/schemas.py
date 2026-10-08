"""Pydantic schemas: API payloads AND strict validation of agent JSON output."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.config import get_settings

Difficulty = Literal["Easy", "Medium", "Hard"]
SessionStatus = Literal["active", "deal", "walkaway", "ended"]
TurnStatus = Literal["continue", "deal", "walkaway"]


# ---------- API requests ----------
class SessionCreate(BaseModel):
    domain: str = Field(min_length=1, max_length=32)
    difficulty: Difficulty = "Medium"
    goal: str = Field(min_length=3, max_length=500)
    context: str = Field(default="", max_length=1500)


class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=get_settings().max_message_chars)


# ---------- Agent outputs (validated; invalid JSON triggers repair in step 4) ----------
class CounterpartTurn(BaseModel):
    text: str
    status: TurnStatus = "continue"


class CoachFeedback(BaseModel):
    rating: int = Field(ge=1, le=10)
    issue: str
    better_phrasing: str
    unused_leverage: str
    tactic_detected: str = ""


class Dimensions(BaseModel):
    preparation: int = Field(ge=0, le=10)
    assertiveness: int = Field(ge=0, le=10)
    concessions: int = Field(ge=0, le=10)
    leverage_use: int = Field(ge=0, le=10)
    outcome: int = Field(ge=0, le=10)


class Rewrite(BaseModel):
    said: str
    better: str


class Scorecard(BaseModel):
    score: int = Field(ge=0, le=100)
    verdict: str
    dimensions: Dimensions
    leverage_used: list[str] = []
    opportunities_missed: list[str] = []
    rewrites: list[Rewrite] = []
    next_steps: list[str] = []


# ---------- API responses ----------
class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    content: str


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    domain: str
    difficulty: str
    goal: str
    context: str
    status: str
    created_at: datetime


class HealthOut(BaseModel):
    status: str
    provider: str
    model: str

# ---------- Step 5: session, history and stats responses ----------
class SessionStarted(BaseModel):
    session_id: str
    opening_message: str
    status: str = "active"


class CoachNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    message_id: int  # the user message this feedback is about
    rating: int
    issue: str
    better_phrasing: str
    unused_leverage: str
    tactic_detected: str


class SessionDetail(SessionOut):
    messages: list[MessageOut]
    coach_notes: list[CoachNoteOut]
    scorecard: Scorecard | None = None


class EndOut(BaseModel):
    status: str
    scorecard: Scorecard


class HistoryItem(BaseModel):
    id: str
    domain: str
    difficulty: str
    goal: str
    status: str
    created_at: datetime
    score: int | None = None  # None until the session has been debriefed


class DomainStat(BaseModel):
    count: int
    average: float


class RecentScore(BaseModel):
    session_id: str
    score: int
    domain: str
    difficulty: str
    created_at: datetime


class StatsOut(BaseModel):
    sessions_total: int
    scored_sessions: int
    average_score: float | None
    best_score: int | None
    trend: str  # improving | declining | steady | not_enough_data
    by_domain: dict[str, DomainStat]
    dimension_averages: dict[str, float]
    suggested_difficulty: str
    suggestion_reason: str
    recent: list[RecentScore]  # oldest to newest, for charts