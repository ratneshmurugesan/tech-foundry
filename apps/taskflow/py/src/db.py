import os
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)
from sqlalchemy.orm import DeclarativeBase

"""
SQLAlchemy async engine + session factory.
"""

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/taskflow"
)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(
    engine,
    class_ = AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    "Base class for all SQLAlchemy table models."
    pass

async def init_db() -> None:
    "Create all tables on startup"
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Python DB connected, tables created")

async def get_session() -> AsyncSession:
    "Return a new async session for use in repository methods. Each request gets its own session — no shared state."
    return async_session()