from app.api import history as history_api
from app.api import sessions as sessions_api
from app.api import domains as domains_api
import logging
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.models.db import init_db
from app.models.schemas import HealthOut

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("dojo")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("Negotiation Dojo API started (provider=%s, model=%s)", settings.llm_provider, settings.resolved_model)
    yield


app = FastAPI(title="Negotiation Dojo API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origin.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")


@api.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", provider=settings.llm_provider, model=settings.resolved_model)


api.include_router(domains_api.router)
api.include_router(sessions_api.router)
api.include_router(history_api.router)
app.include_router(api)


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})