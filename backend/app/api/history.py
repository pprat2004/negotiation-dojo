from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.deps import get_db, get_user_id
from app.models.schemas import HistoryItem, StatsOut
from app.services import history_service as hs

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[HistoryItem])
def history(limit: int = Query(50, ge=1, le=200), user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    return hs.list_items(db, user_id, limit)


@router.get("/stats", response_model=StatsOut)
def history_stats(user_id: str = Depends(get_user_id), db: Session = Depends(get_db)):
    return hs.stats(db, user_id)