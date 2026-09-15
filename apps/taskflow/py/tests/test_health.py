async def test_root_returns_200(client):
    """Verifies that the root health endpoint returns a successful 200 response."""

    r = await client.get("/")

    assert r.status_code == 200

    print("@@", r.json())

    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "taskflow"