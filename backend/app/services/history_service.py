"""Per-user history and progress statistics."""
from collections import defaultdict
from statistics import mean

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.db import NegotiationSession as NS
from app.models.db import ScorecardRecord as SR
from app.models.schemas import Dimensions, DomainStat, HistoryItem, RecentScore, StatsOut

from .difficulty import suggest_difficulty, trend


def list_items(db: Session, user_id: str, limit: int = 50) -> list[HistoryItem]:
    q = (
        select(NS, SR.score)
        .outerjoin(SR, SR.session_id == NS.id)
        .where(NS.user_id == user_id)
        .order_by(NS.created_at.desc())
        .limit(limit)
    )
    return [
        HistoryItem(id=s.id, domain=s.domain, difficulty=s.difficulty, goal=s.goal,
                    status=s.status, created_at=s.created_at, score=score)
        for s, score in db.execute(q).all()
    ]


def stats(db: Session, user_id: str) -> StatsOut:
    total = db.scalar(select(func.count()).select_from(NS).where(NS.user_id == user_id)) or 0
    rows = db.execute(
        select(NS.id, NS.domain, NS.difficulty, SR.score, SR.data, SR.created_at)
        .join(SR, SR.session_id == NS.id)
        .where(NS.user_id == user_id)
        .order_by(SR.created_at)
    ).all()

    scores = [r.score for r in rows]
    per_domain: dict[str, list[int]] = defaultdict(list)
    for r in rows:
        per_domain[r.domain].append(r.score)

    dimension_averages = (
        {k: round(mean(r.data["dimensions"][k] for r in rows), 1) for k in Dimensions.model_fields} if rows else {}
    )
    level, reason = suggest_difficulty(scores)

    return StatsOut(
        sessions_total=total,
        scored_sessions=len(rows),
        average_score=round(mean(scores), 1) if scores else None,
        best_score=max(scores) if scores else None,
        trend=trend(scores),
        by_domain={d: DomainStat(count=len(v), average=round(mean(v), 1)) for d, v in per_domain.items()},
        dimension_averages=dimension_averages,
        suggested_difficulty=level,
        suggestion_reason=reason,
        recent=[
            RecentScore(session_id=r.id, score=r.score, domain=r.domain, difficulty=r.difficulty, created_at=r.created_at)
            for r in rows[-20:]
        ],
    )