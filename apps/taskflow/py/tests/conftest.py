import os
import pytest
from httpx import ASGITransport, AsyncClient

os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:9/taskflow"

import src.server

app = src.server.app

@pytest.fixture
async def client():
    """Provides an in-process HTTPX client bound to ASGI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test")as ac:
        yield ac





