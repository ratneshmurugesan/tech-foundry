"""
The Razorpay seam (ADR-014) — the cashier. Three pure hearts + one network call.

- `transition(state, event)`: the plan state machine (fully wired, ADR-015).
- `verify_signature(...)`: the client-side payment signature check (HMAC-SHA256 over
  `order_id|payment_id`). Pure.
- `verify_webhook_signature(...)`: the server-side webhook signature check (HMAC-SHA256
  over the RAW request body). Pure — the day-16 real-code seam.
- `extract_order_id(...)`: pull the order id out of a parsed webhook payload. Pure.
- `create_order(...)`: the ONE outbound network call (Razorpay order creation). Async.
"""
import hashlib
import hmac

import httpx

from .constants import TRANSITIONS, RAZORPAY_API


def transition(state: str, event: str) -> str | None:
    """The plan state machine (fully wired, ADR-015). Returns the next state, or None if
    the (state, event) pair is not in the table (the "refused" / no-op case)."""
    return TRANSITIONS.get(state, {}).get(event)


def verify_signature(order_id: str, payment_id: str, amount: int, secret: str, signature: str) -> bool:
    """Verify the client-side payment signature = HMAC_SHA256(f"{order_id}|{payment_id}", secret).
    `amount` is accepted for parity with the order but is NOT part of the payment signature.
    Constant-time compare (no timing oracle)."""
    expected = hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body: bytes, secret: str, signature: str) -> bool:
    """Verify the server-side webhook signature = HMAC_SHA256(raw_body, webhook_secret).
    Razorpay signs the EXACT request bytes (the raw body, not a re-serialized JSON).
    Constant-time compare (no timing oracle). Pure — no network, no DB."""
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def extract_order_id(payload: dict) -> str | None:
    """Pull the Razorpay order id out of a parsed webhook payload. Pure.

    Razorpay nests the entity under `payload.<type>.entity` (e.g.
    `payload.payment.entity.order_id`). We tolerate the `data` wrapper and a
    non-`entity`-wrapped object too, so a shape drift can never silently no-op the
    handler (the day-16 live round-trip caught exactly that). Returns None if no
    order id is present — the handler then answers a 200 no-op, not a crash."""
    for wrapper_key in ("payload", "data"):
        wrapper = payload.get(wrapper_key)
        if not isinstance(wrapper, dict):
            continue
        for entity_key in ("payment", "order", "subscription"):
            node = wrapper.get(entity_key)
            if not isinstance(node, dict):
                continue
            # The real payload wraps the entity object under an `entity` key.
            entity = node.get("entity") if isinstance(node.get("entity"), dict) else node
            order_id = entity.get("order_id") or entity.get("id")
            if order_id:
                return order_id
    return None


async def _fetch(url: str, auth, json) -> httpx.Response:
    """The default outbound call — the one real network seam of the day."""
    async with httpx.AsyncClient() as client:
        return await client.post(url, auth=auth, json=json)


async def create_order(key_id: str, key_secret: str, amount: int, currency: str, receipt: str, fetch=_fetch) -> dict:
    """Create a Razorpay order. Returns the order object (id, amount, currency, key_id).
    `fetch` is injectable so tests can fake the cashier without a network."""
    url = f"https://{RAZORPAY_API}/orders"
    payload = {"amount": amount, "currency": currency, "receipt": receipt}
    r = await fetch(url, (key_id, key_secret), payload)
    r.raise_for_status()
    return r.json()