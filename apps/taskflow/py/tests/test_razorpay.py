"""
Day-15/16 — Razorpay checkout + webhook suite (ADR-014, ADR-015).

ADR-010: zero-service. conftest points DATABASE_URL at port 9 (deterministically
refused), so no Postgres; no Razorpay key is read; no Auth0 (doorless). The pure
hearts are unit-tested in isolation; the routes are integration-tested with a faked
Razorpay seam and the refused cellar.

Parity: the TS sibling (tests/razorpay.test.ts) feeds the same inputs and asserts the
same two new strings (8000 == 8001).

Suites:
  1. state machine       — transition(): full table (ADR-015); canceled terminal
  2. event map           — EVENT_MAP: Razorpay event.name -> machine event (static lookup)
  3. sig verify          — verify_signature(): right sig True, wrong sig False
  4. webhook sig verify  — verify_webhook_signature(): HMAC over raw body (ADR-015)
  5. plan->role          — assert_role(..., plan_tier): free member read-only, starter member may write
  6. checkout route      — faked Razorpay -> 201 pending plan (zero services)   [INTEGRATION - TODO]
  7. inspector           — no-key -> 503; dead-cellar plans read -> 500          [INTEGRATION - TODO]
  8. webhook route       — POST /webhooks/razorpay (faked sig, faked cellar)     [INTEGRATION - TODO]
"""
import hashlib
import hmac

import pytest

from src.razorpay import transition, verify_signature, verify_webhook_signature
from src.constants import EVENT_MAP
from src.authorize import assert_role
from src.errors import ForbiddenError
from src.types import WorkspaceMember

WS, SUB = "w-1", "u-1"


# --------------------------------------------------------------------------- #
# 1. The plan state machine — pure, the unit-testable heart (ADR-015, fully wired)
# --------------------------------------------------------------------------- #
# Full table: trial+paid->active, trial+unsubscribe->canceled,
#             active+payment_failed->past_due, active+unsubscribe->canceled,
#             past_due+paid->active (recovery), past_due+unsubscribe->canceled,
#             canceled = terminal (no outgoing edges).
# `paid` serves double duty: initial activation (from trial) AND recovery (from past_due).
# The state table disambiguates — no state-aware mapping needed.
@pytest.mark.parametrize(
    ("state", "event", "expected"),
    [
        ("trial", "paid", "active"),               # initial activation
        ("trial", "payment_failed", None),         # trial can't jump to past_due
        ("trial", "unsubscribe", "canceled"),     # any -> canceled
        ("active", "paid", None),                  # already active; idempotent noop
        ("active", "payment_failed", "past_due"),  # the bounce
        ("active", "unsubscribe", "canceled"),    # any -> canceled
        ("past_due", "paid", "active"),            # recovery
        ("past_due", "payment_failed", None),     # already past_due; noop
        ("past_due", "unsubscribe", "canceled"),  # any -> canceled
        ("canceled", "paid", None),               # terminal — nothing leaves canceled
        ("canceled", "payment_failed", None),     # terminal
        ("canceled", "unsubscribe", None),        # terminal
    ],
)
def test_state_machine(state, event, expected):
    assert transition(state, event) == expected


# --------------------------------------------------------------------------- #
# 2. The webhook event map — static lookup (ADR-015)
#    Razorpay event.name -> our machine event. The state table disambiguates.
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    ("razorpay_event", "expected"),
    [
        ("payment.captured", "paid"),
        ("payment.failed", "payment_failed"),
        ("refund.created", "unsubscribe"),
        ("subscription.paid", "paid"),
        ("subscription.halted", "payment_failed"),
        ("subscription.cancelled", "unsubscribe"),
    ],
)
def test_event_map(razorpay_event, expected):
    assert EVENT_MAP[razorpay_event] == expected


def test_event_map_unknown_event_not_in_map():
    # An unknown event name is not in the map; the handler treats it as "ignored".
    assert "some.unknown.event" not in EVENT_MAP


# --------------------------------------------------------------------------- #
# 3. Signature verify — the client-side payment signature (ADR-014)
#    Razorpay's client-side payment sig = HMAC_SHA256(f"{order_id}|{payment_id}", key_secret).
# --------------------------------------------------------------------------- #
def _sig(order_id: str, payment_id: str, secret: str) -> str:
    return hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def test_verify_signature_accepts_correct():
    secret = "test_secret"
    sig = _sig("order_1", "pay_1", secret)
    assert verify_signature("order_1", "pay_1", 49900, secret, sig) is True


def test_verify_signature_rejects_wrong_signature():
    assert verify_signature("order_1", "pay_1", 49900, "test_secret", "deadbeef") is False


def test_verify_signature_rejects_wrong_amount_is_not_used():
    # amount is accepted for parity but is NOT part of the payment signature;
    # a tampered amount must not, by itself, flip the result.
    secret = "test_secret"
    sig = _sig("order_1", "pay_1", secret)
    assert verify_signature("order_1", "pay_1", 999999, secret, sig) is True


# --------------------------------------------------------------------------- #
# 4. Webhook signature verify — the day-16 real-code seam (ADR-015)
#    Razorpay signs the EXACT request bytes: HMAC_SHA256(raw_body, webhook_secret).
# --------------------------------------------------------------------------- #
def _webhook_sig(raw_body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()


def test_webhook_sig_accepts_correct():
    secret = "wh_secret"
    body = b'{"event":{"name":"payment.captured"}}'
    sig = _webhook_sig(body, secret)
    assert verify_webhook_signature(body, secret, sig) is True


def test_webhook_sig_rejects_wrong_signature():
    body = b'{"event":{"name":"payment.captured"}}'
    assert verify_webhook_signature(body, "wh_secret", "deadbeef") is False


def test_webhook_sig_rejects_wrong_secret():
    body = b'{"event":{"name":"payment.captured"}}'
    sig = _webhook_sig(body, "wh_secret")
    assert verify_webhook_signature(body, "wrong_secret", sig) is False


def test_webhook_sig_rejects_tampered_body():
    secret = "wh_secret"
    body = b'{"event":{"name":"payment.captured"}}'
    sig = _webhook_sig(body, secret)
    tampered = b'{"event":{"name":"refund.created"}}'
    assert verify_webhook_signature(tampered, secret, sig) is False


# --------------------------------------------------------------------------- #
# 5. plan -> role — the conceptual spine (spec 2.5)
#    free  -> member is read-only (rank 1)  ;  starter -> member's effective rank lifts to owner.
#    A defaulted plan_tier=None must leave the ADR-012 ladder untouched (F3).
# --------------------------------------------------------------------------- #
async def _as_member(ws_id: str, user_id: str) -> WorkspaceMember:
    return WorkspaceMember(id="m-1", workspace_id=ws_id, user_id=user_id, role="member")


@pytest.mark.asyncio
async def test_free_member_is_read_only():
    with pytest.raises(ForbiddenError) as exc_info:
        await assert_role(WS, SUB, "owner", _as_member, plan_tier="free")
    assert exc_info.value.message == "Requires the owner role"


@pytest.mark.asyncio
async def test_starter_member_may_write():
    # no raise: the tier lifts the member's effective rank to owner
    await assert_role(WS, SUB, "owner", _as_member, plan_tier="starter")


@pytest.mark.asyncio
async def test_default_tier_leaves_ladder_untouched():
    # plan_tier omitted (None) -> the day-10 ladder, unchanged (keeps test_authorize green)
    with pytest.raises(ForbiddenError) as exc_info:
        await assert_role(WS, SUB, "owner", _as_member)
    assert exc_info.value.message == "Requires the owner role"


# --------------------------------------------------------------------------- #
# 4. checkout route — integration, faked Razorpay seam (zero services)  [TODO]
# --------------------------------------------------------------------------- #
# TODO(day-15): inject a fake create_order (the same fake-reader seam the authorizer
# uses) -> POST /workspaces/{id}/billing/checkout returns 201 with a pending plan
# (state='trial', razorpay_order_id recorded), no state change. Assert the plan row.


# --------------------------------------------------------------------------- #
# 5. inspector — fail-closed + dead-cellar shapes  [TODO]
# --------------------------------------------------------------------------- #
# TODO(day-15): no RAZORPAY_KEY_ID -> checkout & verify return 503 "Razorpay is not
# configured" (shaped, not a crash). A dead-cellar `plans` read under doorless -> welded 500.
