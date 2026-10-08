"""SQLAlchemy models + engine. SQLite by default, swappable via DATABASE_URL."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)

from app.config import get_settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class NegotiationSession(Base):
    """One practice negotiation (named to avoid clashing with SQLAlchemy's Session)."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    domain: Mapped[str] = mapped_column(String(32))
    difficulty: Mapped[str] = mapped_column(String(16))
    goal: Mapped[str] = mapped_column(Text)
    context: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="active")  # active|deal|walkaway|ended
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="Message.id"
    )
    coach_notes: Mapped[list["CoachNote"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="CoachNote.id"
    )
    scorecard: Mapped[Optional["ScorecardRecord"]] = relationship(
        back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | counterpart
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    session: Mapped[NegotiationSession] = relationship(back_populates="messages")


class CoachNote(Base):
    """Coach feedback attached to one user message."""

    __tablename__ = "coach_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id"))
    rating: Mapped[int] = mapped_column(Integer)
    issue: Mapped[str] = mapped_column(Text, default="")
    better_phrasing: Mapped[str] = mapped_column(Text, default="")
    unused_leverage: Mapped[str] = mapped_column(Text, default="")
    tactic_detected: Mapped[str] = mapped_column(String(120), default="")

    session: Mapped[NegotiationSession] = relationship(back_populates="coach_notes")


class ScorecardRecord(Base):
    __tablename__ = "scorecards"

    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), primary_key=True)
    score: Mapped[int] = mapped_column(Integer, index=True)
    data: Mapped[dict] = mapped_column(JSON)  # full Scorecard schema as JSON
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    session: Mapped[NegotiationSession] = relationship(back_populates="scorecard")


def _prepare_sqlite_path(url: str) -> None:
    """Create the parent folder for a file-based SQLite DB (needed for ./data/dojo.db)."""
    if url.startswith("sqlite:///"):
        path = url.replace("sqlite:///", "", 1)
        if path and path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)


_url = get_settings().database_url
_prepare_sqlite_path(_url)
engine = create_engine(
    _url, connect_args={"check_same_thread": False} if _url.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(engine)