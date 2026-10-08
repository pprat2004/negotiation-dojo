import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import deps
from app.deps import get_db, get_llm, get_session_factory
from app.llm.mock_client import MockLLM
from app.main import app
from app.models.db import Base


@pytest.fixture
def client():
    """API client wired to a throwaway in-memory database and the mock LLM."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _db():
        db = Factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_session_factory] = lambda: Factory
    app.dependency_overrides[get_llm] = lambda: MockLLM()
    deps._hits.clear()
    yield TestClient(app)  # no "with": skips the lifespan so the real dojo.db is untouched
    app.dependency_overrides.clear()
    deps._hits.clear()