"""Session endpoints: start, send a message (SSE), end and debrief, read back."""
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, sessionmaker

from app.agents.base import Msg, SessionContext, sanitize_user_text
from app.agents.orchestrator import Orchestrator
from app.config import get_settings
from app.deps import get_db, get_orchestrator, get_session_factory, get_user_id, rate_limit
from app.domains.loader import get_domain
from app.models.schemas import CoachFeedback, EndOut, MessageIn, Scorecard, SessionCreate, SessionDetail, SessionStarted
from app.services import session_service as svc

log = logging.getLogger("dojo.api")
router = APIRouter(prefix="/sessions", tags=["sessions"])
LLM_DOWN = "The AI provider had a problem. Please try again."


def _owned_or_404(db: Session, session_id: str, user_id: str):
    s = svc.get_owned(db, session_id, user_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    return s


@router.post("", response_model=SessionStarted, status_code=201)
async def create_session(
    body: SessionCreate,
    user_id: str = Depends(rate_limit),
    db: Session = Depends(get_db),
    orch: Orchestrator = Depends(get_orchestrator),
) -> SessionStarted:
    try:
        get_domain(body.domain)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc.args[0]))

    # goal and context are pasted into agent prompts, so they get the same sanitising as chat text
    goal = sanitize_user_text(body.goal, 500)
    context = sanitize_user_text(body.context, 1500)
    if len(goal) < 3:
        raise HTTPException(status_code=422, detail="Goal is too short.")

    ctx = SessionContext(body.domain, body.difficulty, goal, context)
    try:
        opening = await orch.start(ctx)  # call the LLM first so a failure leaves nothing behind
    except Exception:
        log.exception("opening failed")
        raise HTTPException(status_code=502, detail=LLM_DOWN)

    s = svc.create_session(db, user_id, body.domain, body.difficulty, goal, context)
    svc.add_message(db, s.id, "counterpart", opening.text)
    return SessionStarted(session_id=s.id, opening_message=opening.text)


async def _stream_turn(
    factory: sessionmaker,
    orch: Orchestrator,
    session_id: str,
    user_msg_id: int,
    ctx: SessionContext,
    history: list[Msg],
    text: str,
) -> AsyncIterator[str]:
    """Relay orchestrator events as SSE and persist results BEFORE each event is sent,
    so the database is never behind what the client has seen."""
    reply_saved = False
    try:
        async for ev in orch.turn(ctx, history, text):
            if ev.type == "counterpart_done":
                with factory() as db:
                    svc.add_message(db, session_id, "counterpart", ev.data["text"])
                    if ev.data["status"] != "continue":
                        svc.set_status(db, session_id, ev.data["status"])
                reply_saved = True
            elif ev.type == "coach":
                with factory() as db:
                    svc.add_coach_note(db, session_id, user_msg_id, CoachFeedback(**ev.data))
            yield ev.sse()
    finally:
        if not reply_saved:  # counterpart failed or the client disconnected: undo the user's move
            with factory() as db:
                svc.discard_user_message(db, user_msg_id)


@router.post("/{session_id}/messages")
async def send_message(
    session_id: str,
    body: MessageIn,
    user_id: str = Depends(rate_limit),
    factory: sessionmaker = Depends(get_session_factory),
    orch: Orchestrator = Depends(get_orchestrator),
) -> StreamingResponse:
    clean = sanitize_user_text(body.content)
    if not clean:
        raise HTTPException(status_code=422, detail="Message is empty.")

    with factory() as db:
        s = _owned_or_404(db, session_id, user_id)
        if s.status != "active":
            raise HTTPException(status_code=409, detail="This negotiation has already ended.")
        if svc.count_user_messages(s) >= get_settings().max_rounds_per_session:
            raise HTTPException(status_code=409, detail="Round limit reached. End the session to see your debrief.")
        ctx, history = svc.context_of(s), svc.history_of(s)
        user_msg_id = svc.add_message(db, s.id, "user", clean).id

    return StreamingResponse(
        _stream_turn(factory, orch, session_id, user_msg_id, ctx, history, clean),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{session_id}/end", response_model=EndOut)
async def end_session(
    session_id: str,
    user_id: str = Depends(rate_limit),
    db: Session = Depends(get_db),
    orch: Orchestrator = Depends(get_orchestrator),
) -> EndOut:
    s = _owned_or_404(db, session_id, user_id)
    if s.scorecard:  # already debriefed: return the saved result, no second LLM call
        return EndOut(status=s.status, scorecard=Scorecard(**s.scorecard.data))
    if svc.count_user_messages(s) < 1:
        raise HTTPException(status_code=409, detail="Make at least one move before ending the session.")

    final_status = s.status if s.status in ("deal", "walkaway") else "ended"
    try:
        card = await orch.debrief(svc.context_of(s), svc.history_of(s), final_status)
    except Exception:
        log.exception("debrief failed")
        raise HTTPException(status_code=502, detail=LLM_DOWN)

    svc.save_scorecard(db, s, card, final_status)
    return EndOut(status=final_status, scorecard=card)


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: str, user_id: str = Depends(get_user_id), db: Session = Depends(get_db)) -> SessionDetail:
    return svc.detail_of(_owned_or_404(db, session_id, user_id))