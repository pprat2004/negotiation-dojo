from fastapi import APIRouter

from app.domains.loader import list_domains

router = APIRouter(tags=["domains"])


@router.get("/domains")
def get_domains() -> list[dict]:
    """Domains with default goal/context so the frontend can prefill the Setup form."""
    return [d.public() for d in list_domains()]