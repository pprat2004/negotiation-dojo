"""Database access for sessions, messages, coach notes and scorecards."""
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.agents.base import Msg, SessionContext
from app.models.db import CoachNote, Message, NegotiationSession, ScorecardRecord
from app.models.schemas import (
    CoachFeedback,
    CoachNoteOut,
    MessageOut,
    Scorecard,
    SessionDetail,
    SessionOut,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_session(db: Session, user_id: str, domain: str, difficulty: str, goal: str, context: str) -> NegotiationSession:
    s = NegotiationSession(user_id=user_id, domain=domain, difficulty=difficulty, goal=goal, context=context)
    db.add(s)
    db.commit()
    return s


def get_owned(db: Session, session_id: str, user_id: str) -> NegotiationSession | None:
    """Returns None for both 'missing' and 'someone else's', so ids can't be probed."""
    s = db.get(NegotiationSession, session_id)
    return s if s and s.user_id == user_id else None


def context_of(s: NegotiationSession) -> SessionContext:
    return SessionContext(s.domain, s.difficulty, s.goal, s.context)


def history_of(s: NegotiationSession) -> list[Msg]:
    return [Msg(m.role, m.content) for m in s.messages]  # relationship is ordered by id


def count_user_messages(s: NegotiationSession) -> int:
    return sum(1 for m in s.messages if m.role == "user")


def add_message(db: Session, session_id: str, role: str, content: str) -> Message:
    msg = Message(session_id=session_id, role=role, content=content)
    db.add(msg)
    db.commit()
    return msg


def add_coach_note(db: Session, session_id: str, message_id: int, fb: CoachFeedback) -> None:
    db.add(CoachNote(session_id=session_id, message_id=message_id, **fb.model_dump()))
    db.commit()


def set_status(db: Session, session_id: str, status: str) -> None:
    s = db.get(NegotiationSession, session_id)
    s.status = status
    if status != "active" and not s.ended_at:
        s.ended_at = _now()
    db.commit()


def discard_user_message(db: Session, message_id: int) -> None:
    """Undo a user message whose turn failed, so the transcript never has a dangling question."""
    db.execute(delete(CoachNote).where(CoachNote.message_id == message_id))
    db.execute(delete(Message).where(Message.id == message_id))
    db.commit()


def save_scorecard(db: Session, s: NegotiationSession, card: Scorecard, status: str) -> None:
    db.add(ScorecardRecord(session_id=s.id, score=card.score, data=card.model_dump()))
    s.status = status
    s.ended_at = s.ended_at or _now()
    db.commit()


def detail_of(s: NegotiationSession) -> SessionDetail:
    base = SessionOut.model_validate(s).model_dump()
    return SessionDetail(
        **base,
        messages=[MessageOut.model_validate(m) for m in s.messages],
        coach_notes=[CoachNoteOut.model_validate(n) for n in s.coach_notes],
        scorecard=Scorecard(**s.scorecard.data) if s.scorecard else None,
    )