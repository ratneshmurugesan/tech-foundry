import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase
from .identity import app_identity

"""
SQLAlchemy async engine + session factory.
The cellar identity is stamped per-session (the door set app_identity; DOORLESS for
doorless/public) so Postgres RLS can filter rows — the app role (taskflow_app) is a
non-owner, so RLS binds it (cellar.sql).
"""

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://taskflow_app:postgres@postgres:5432/taskflow"
)

engine = create_async_engine(DATABASE_URL)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    "Base class for all SQLAlchemy table models."
    pass

async def get_session(identity: str | None = None) -> AsyncSession:
    """Return a new async session stamped with the cellar identity. Each request gets its own
    session — no shared state. `identity` overrides app_identity (the create-bootstrap passes
    DOORLESS explicitly: the workspace doesn't exist yet, so is_member_of is false and the
    WITH CHECK would reject both INSERTs — the sentinel opens them)."""
    s = async_session()
    # The 3rd arg `false` = session-scoped (not transaction-scoped), so the stamp persists for
    # the whole session and RLS sees it on every statement.
    await s.execute(
        text("SELECT set_config('app.current_user_id', :v, false)"),
        {"v": identity if identity is not None else app_identity.get()}
    )
    return s

async def init_db() -> None:
    "Verify connectivity (the schema is owned by db-push, not the app — ADR-002/005)."
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    print("Python DB connected")