import os
import pytest
from httpx import ASGITransport, AsyncClient

# ADR-010: CI is zero-service (no `services: postgres` in ci.yml — the gate is cellarless).
# Port 9 (IANA "discard") is guaranteed to have no listener on a bare runner, so the
# connection is DETERMINISTICALLY refused and ADR-007's opaque 500 is asserted on every
# push. Do not "fix" this to 5432 — a reachable cellar turns the no-DB tests red.
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@127.0.0.1:9/taskflow"

import src.server

app = src.server.app

@pytest.fixture
async def client():
    """Provides an in-process HTTPX client bound to ASGI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test")as ac:
        yield ac





