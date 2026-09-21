import base64
import os

import httpx
import jwt as pyjwt
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicNumbers
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse

from .errors import UnauthorizedError
from jwt.exceptions import (
    DecodeError,
    ExpiredSignatureError,
    InvalidAudienceError,
    InvalidIssuerError,
    InvalidSignatureError
)

# Tenants the reader will ever trust; a stranger tenant fails closed.
ALLOWED_DOMAINS = {"dev-qr8x8ecg3nfb603i.uk.auth0.com"}
# Street (lighthouse "/") + menu stay open - menu == swagger doc -> counter = all routes
PUBLIC_PATHS = {"/", "/docs", "/redoc", "/openapi.json", "/health"}

# JWKS cache: bare-domain -> {kid: jwk}. Re-fetches exactly once on an unknown kid.
_jwks_cache: dict[str, dict] = {}

def _envelope(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"statusCode": 401, "error": "Unauthorized", "message": message},
    )

def _normalize_tenant(raw: str) -> str:
    return raw.removeprefix("https://").removeprefix("http://").rstrip("/")

def _b64url(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))

def _public_key(jwk: dict):
    # JWK (n/e) -> a cryptography key PyJWT can verify with — the hand-rolled 40-liner's heart
    n = int.from_bytes(_b64url(jwk["n"]))
    e = int.from_bytes(_b64url(jwk["e"]))
    return RSAPublicNumbers(e,n).public_key(default_backend())

def _fetch_jwks(domain: str) -> dict[str, dict]:
    # Auth0 returns 426 (Upgrade Required) over plain HTTP; https is mandatory.
    r = httpx.get(f"https://{domain}/.well-known/jwks.json", timeout=5)
    r.raise_for_status()
    jwks = {k["kid"]: k for k in r.json()["keys"]}
    _jwks_cache[domain] = jwks
    return jwks

def map_fail_reason(err: Exception) -> str:
    """Fix to internal PyJWT exceptions to the six-string contract."""
    if isinstance(err, ExpiredSignatureError):
        return "Token expired"
    if isinstance(err, InvalidAudienceError):
        return "Wrong audience"
    if isinstance(err, InvalidIssuerError):
        return "Wrong issuer"
    if isinstance(err, DecodeError) and not isinstance(err, InvalidSignatureError):
        return "Malformed token"
    return "Signature verification failed"  # bad sig / unknown kid / no network — fail-closed

def verify_badge(token: str, tenant: str, audience: str) -> dict:
    if not _is_jws(token):
        raise UnauthorizedError("Malformed token")  # garbage reads Malformed, not a sig failure
    try:
        kid = pyjwt.get_unverified_header(token).get("kid")
        jwks = _jwks_cache.get(tenant) or _fetch_jwks(tenant)
        jwk = jwks.get(kid)
        if jwk is None:
            jwks = _fetch_jwks(tenant)
            jwk = jwks.get(kid)
        if jwk is None:
            raise UnauthorizedError("Signature verification failed")
        # Auth0 appends a trailing slash to iss (https://{domain}/) — the expected
        # issuer must carry it or PyJWT's exact iss match rejects a valid token.
        return pyjwt.decode(
            token, _public_key(jwk), algorithms=["RS256"],
            audience=audience, issuer=f"https://{tenant}/",
        )
    except UnauthorizedError:
        raise
    except Exception as err:
        raise UnauthorizedError(map_fail_reason(err))

def _is_jws(token: str) -> bool:
    parts = token.split(".")
    alpha = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
    return len(parts) == 3 and all(p and all(c in alpha for c in p) for p in parts)

class AuthenticateBadgeMiddleware(BaseHTTPMiddleware):
    """ONE choke point — a single global door, not per-room doors."""

    async def dispatch(self, request: Request, call_next) -> Response:
        tenant = os.environ.get("AUTH0_DOMAIN")
        if not tenant or request.url.path in PUBLIC_PATHS:
            return await call_next(request)  # doorless-auth or a public path

        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return _envelope("No token provided")
        
        token = auth_header.split(" ", 1)[1]
        # The env tenant is trusted operator config. A per-request header may
        # override it, but it is untrusted client input: gate it on the allowlist
        # (else fail closed). Without the header we use the env tenant as-is — a
        # single-tenant allowlist must not block the configured tenant itself.
        override = request.headers.get("x-tenant-domain")
        tenant = _normalize_tenant(override) if override else _normalize_tenant(tenant)
        if override and tenant not in ALLOWED_DOMAINS:
            return _envelope("Signature verification failed")  # stranger tenant fails closed

        audience = os.environ.get("AUTH0_AUDIENCE") or "foundry-taskflow-api-aud"

        try:
            request.state.user = verify_badge(token, tenant, audience)
        except UnauthorizedError as err:
            return _envelope(err.message)
        except Exception:
            return _envelope("Signature verification failed")  # fail-closed, never a silent pass

        return await call_next(request)

