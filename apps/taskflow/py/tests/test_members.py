"""Golden-matrix contract tests for POST /workspaces/{id}/members — the parity wall (ADR-001).

The members-POST route is gated by the door (AuthenticateBadgeMiddleware) + the key-ring
(AuthorizeMiddleware). These tests assert the two paths that are reachable *cellarless*
(ADR-010: CI has no Postgres, so any DB read/write 500s):

- **401 no badge** — the door rejects before any DB or body work (needs AUTH0_DOMAIN set;
  the door is doorless without it).
- **400 missing user_id** — doorless (no AUTH0_DOMAIN), so the door + key-ring pass and the
  request reaches body validation, which fails on the now-required user_id.

The happy path (201) and the 409 dup-check both hit the cellar, so they are NOT asserted
here (cellarless CI would 500 on the DB read); they are covered by the compose integration
run. The TS twin lives in ts/tests/members.test.ts and asserts the identical status + envelope.
"""

# A valid UUID for the {id} path param (the TS kitchen validates it as z.uuid()).
WS_ID = "123e4567-e89b-42d3-a456-426614174000"


async def test_invite_requires_a_badge(client, monkeypatch):
    """No Authorization header -> the door answers 401 before any DB or body work."""
    monkeypatch.setenv("AUTH0_DOMAIN", "stub.auth0.com")
    r = await client.post(f"/workspaces/{WS_ID}/members", json={"user_id": "auth0|someone"})
    assert r.status_code == 401
    body = r.json()
    assert body["statusCode"] == 401
    assert body["error"] == "Unauthorized"
    assert body["message"] == "No token provided"


async def test_invite_requires_user_id(client, monkeypatch):
    """Doorless (no AUTH0_DOMAIN): the body must carry user_id, else 400 Validation failed."""
    monkeypatch.delenv("AUTH0_DOMAIN", raising=False)
    r = await client.post(f"/workspaces/{WS_ID}/members", json={})
    assert r.status_code == 400
    body = r.json()
    assert body["statusCode"] == 400
    assert body["error"] == "Bad Request"
    assert body["message"] == "Validation failed"
