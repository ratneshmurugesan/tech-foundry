async def test_root_returns_200(client):
    """Verifies that the root health endpoint returns a successful 200 response."""

    r = await client.get("/")

    assert r.status_code == 200

    print("@@", r.json())

    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "taskflow-py"


async def test_health_returns_200(client):
    """The lighthouse (ADR-006/011): GET /health answers 200 with no badge.

    Golden-matrix parity (ADR-001): the body is kitchen-identical — the TS twin
    (ts/tests/health.test.ts) asserts the same {"status": "ok"}.
    """
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}