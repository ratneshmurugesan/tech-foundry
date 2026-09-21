import base64
import time

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import respx
import asyncio
from starlette.responses import JSONResponse

from src import auth
from src.errors import UnauthorizedError

TENANT = "stub.auth0.com"
# Auth0 appends a trailing slash to iss (https://{domain}/) — model that exact
# reality, or the reader's iss check rejects an otherwise-valid badge.
ISS = f"https://{TENANT}/"
AUD = "foundry-taskflow-api-aud"
JWKS_URL = f"https://{TENANT}/.well-known/jwks.json"

@pytest.fixture
def rsa_keypair():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)

@pytest.fixture
def jwk(rsa_keypair):
    nums = rsa_keypair.public_key().public_numbers()
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    n = b64(nums.n.to_bytes((nums.n.bit_length() + 7) // 8, "big"))
    e = b64(nums.e.to_bytes((nums.e.bit_length() + 7) // 8, "big"))
    return {"kty": "RSA", "use": "sig", "kid": "test", "alg": "RS256", "n": n, "e": e}

@pytest.fixture
def private_pem(rsa_keypair):
    return rsa_keypair.private_bytes(
        encoding=Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

@pytest.fixture
def seed_jwks_auth(monkeypatch, jwk):
    """Seeds the reader's JWKS cache so no network is needed for the normal path."""
    monkeypatch.setitem(auth._jwks_cache, TENANT, {jwk["kid"]: jwk})
    monkeypatch.setenv("AUTH0_DOMAIN", TENANT)
    monkeypatch.setenv("AUTH0_AUDIENCE", AUD)
    yield

@pytest.fixture
def mock_payload(jwk):
    return { "kid": jwk["kid"] }

def sign(private_pem, kid, **extra):
    base = {"sub": "auth0|u-1", "email": "u@foundry.dev", "iss": ISS, "aud": AUD, "exp": int(time.time()) + 3600, "iat": int(time.time())}
    base.update(extra)
    return pyjwt.encode(
        base, private_pem, algorithm="RS256",
        headers={"kid": kid, "typ": "JWT", "alg": "RS256"},
    )

CONTRACT = [
    "No token provided",
    "Malformed token",
    "Signature verification failed",
    "Token expired",
    "Wrong audience",
    "Wrong issuer",
]

def test_six_string_contract_is_stable():
    assert len(set(CONTRACT)) == 6

def test_success_returns_full_payload(seed_jwks_auth, private_pem, jwk):
    payload = auth.verify_badge(sign(private_pem, jwk["kid"]), TENANT, AUD)
    assert payload["sub"] == "auth0|u-1"
    assert payload["email"] == "u@foundry.dev"
    assert payload["iss"] == ISS
    assert payload["aud"] == AUD

def test_expired_token(seed_jwks_auth, private_pem, jwk):
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge(sign(private_pem, jwk["kid"], exp=int(time.time()) - 10), TENANT, AUD)
    assert str(e.value) == "Token expired"

def test_wrong_audience(seed_jwks_auth, private_pem, jwk):
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge(sign(private_pem, jwk["kid"], aud="someone-else"), TENANT, AUD)
    assert str(e.value) == "Wrong audience"

def test_wrong_issuer(seed_jwks_auth, private_pem, jwk):
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge(sign(private_pem, jwk["kid"], iss="https://other.example"), TENANT, AUD)
    assert str(e.value) == "Wrong issuer"

def test_tampered_signature_fails_closed(seed_jwks_auth, private_pem, jwk):
    token = sign(private_pem, jwk["kid"])
    parts = token.split(".")
    parts[2] = parts[2].replace(parts[2][:4], "AAAA")  # corrupt the signature
    tampered = ".".join(parts)
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge(tampered, TENANT, AUD)
    assert str(e.value) == "Signature verification failed"

def test_garbage_reads_malformed(seed_jwks_auth):
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge("this-is-not-a-jwt", TENANT, AUD)
    assert str(e.value) == "Malformed token"

def test_unknown_kid_triggers_one_refetch_then_fails_closed(monkeypatch, private_pem, mock_payload):
    """A badge whose kid is not in the cached JWKS causes a re-fetch (mocked) — if
    the kid is still absent, fail-closed with a Signature reason."""
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
    seed = {
        "kty": "RSA", "kid": "different", "alg": "RS256", "use": "sig",
        "n": base64.urlsafe_b64encode(b"0" * 128).rstrip(b"=").decode(),
        "e": base64.urlsafe_b64encode(b"AQAB").rstrip(b"=").decode(),
    }
    monkeypatch.setitem(auth._jwks_cache, TENANT, {seed["kid"]: seed})

    fetches = []
    def fake_fetch(domain):
        fetches.append(domain)
        return {seed["kid"]: seed}  # re-fetch returns a JWKS that still lacks our kid
    monkeypatch.setattr(auth, "_fetch_jwks", fake_fetch)

    token = sign(private_pem, mock_payload["kid"])
    with pytest.raises(UnauthorizedError) as e:
        auth.verify_badge(token, TENANT, AUD)
    assert str(e.value) == "Signature verification failed"
    assert fetches and fetches[0] == TENANT  # the reader re-fetched exactly to recover

def test_network_failure_is_fail_closed(monkeypatch, private_pem, jwk):
    """No cached JWKS + a dead network must fail closed, never silently pass."""
    monkeypatch.delitem(auth._jwks_cache, TENANT, raising=False)

    with respx.mock(assert_all_called=False) as router:
        router.get(JWKS_URL).mock(respx.MockResponse(500, json={"error": "boom"}))
        token = sign(private_pem, jwk["kid"])
        with pytest.raises(UnauthorizedError) as e:
            auth.verify_badge(token, TENANT, AUD)
    assert str(e.value) == "Signature verification failed"


# --- The door (middleware), not per-room ---

def _envelope(message: str):
    return {"statusCode": 401, "error": "Unauthorized", "message": message}

def _run_dispatch(path: str, headers: list[tuple[bytes, bytes]]):
    from starlette.requests import Request
    scope = {"type": "http", "method": "GET", "path": path, "headers": headers}
    request = Request(scope)

    async def call_next(r):
        return JSONResponse({"ok": True})

    mw = auth.AuthenticateBadgeMiddleware.__new__(auth.AuthenticateBadgeMiddleware)
    return asyncio.run(auth.AuthenticateBadgeMiddleware.dispatch(mw, request, call_next))

def test_door_no_token_is_401(monkeypatch):
    monkeypatch.setenv("AUTH0_DOMAIN", TENANT)
    monkeypatch.setenv("AUTH0_AUDIENCE", AUD)
    resp = _run_dispatch("/workspaces", [])
    assert resp.status_code == 401
    import json
    assert json.loads(resp.body) == _envelope("No token provided")

def test_door_configured_stranger_tenant_fails_closed(monkeypatch):
    monkeypatch.setenv("AUTH0_DOMAIN", TENANT)
    resp = _run_dispatch(
        "/workspaces",
        [
            (b"x-tenant-domain", b"stranger.auth0.com"),
            (b"authorization", b"Bearer aa.bb.cc"),
        ],
    )
    assert resp.status_code == 401
    import json
    assert json.loads(resp.body)["message"] == "Signature verification failed"

def test_door_lighthouse_and_menu_stay_open(monkeypatch):
    monkeypatch.setenv("AUTH0_DOMAIN", TENANT)
    for path in ["/", "/docs", "/openapi.json", "/health"]:
        resp = _run_dispatch(path, [])
        assert resp.status_code == 200, path  # reader is absent on public paths