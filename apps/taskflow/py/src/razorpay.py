"""
The Razorpay seam (ADR-014) — the cashier. Two pure hearts + one network call.

- `transition(state, event)`: the plan state machine. Only trial->active is wired today
  (the `paid` event); the rest are named-but-not-wired (the webhook day) and read as None.
- `verify_signature(...)`: the client-side payment signature check (HMAC-SHA256 over
  `order_id|payment_id`). Pure — the one real-code seam of the day.
- `create_order(...)`: the ONE outbound network call (Razorpay order creation). Async.
"""
import hashlib
import hmac

import httpx

from .constants import TRANSITIONS, RAZORPAY_API


def transition(state: str, event: str) -> str | None:
    """The plan state machine. Returns the next state, or None if the (state, event) pair
    is not wired. Only trial->paid->active ships today; the named-but-not-wired transitions
    (the webhook day) return None and read as "refused" until they ship."""
    return TRANSITIONS.get(state, {}).get(event)


def verify_signature(order_id: str, payment_id: str, amount: int, secret: str, signature: str) -> bool:
    """Verify the client-side payment signature = HMAC_SHA256(f"{order_id}|{payment_id}", secret).
    `amount` is accepted for parity with the order but is NOT part of the payment signature.
    Constant-time compare (no timing oracle)."""
    expected = hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


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