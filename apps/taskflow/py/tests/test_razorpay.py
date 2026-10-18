"""
Day-15 — Razorpay checkout suite (ADR-014).

ADR-010: zero-service. conftest points DATABASE_URL at port 9 (deterministically
refused), so no Postgres; no Razorpay key is read; no Auth0 (doorless). The pure
hearts are unit-tested in isolation; the routes are integration-tested with a faked
Razorpay seam and the refused cellar.

Parity: the TS sibling (tests/razorpay.test.ts) feeds the same inputs and asserts the
same two new strings (8000 == 8001).

Suites:
  1. state machine   — transition(): trial->active wired; the rest named-not-wired; canceled terminal
  2. sig verify      — verify_signature(): right sig True, wrong sig False
  3. plan->role      — assert_role(..., plan_tier): free member read-only, starter member may write
  4. checkout route  — faked Razorpay -> 201 pending plan (zero services)   [INTEGRATION - TODO]
  5. inspector       — no-key -> 503; dead-cellar plans read -> 500          [INTEGRATION - TODO]
"""
import hashlib
import hmac

import pytest

from src.razorpay import transition, verify_signature
from src.authorize import assert_role
from src.errors import ForbiddenError
from src.types import WorkspaceMember

WS, SUB = "w-1", "u-1"


# --------------------------------------------------------------------------- #
# 1. The plan state machine — pure, the unit-testable heart (spec 2.1)
# --------------------------------------------------------------------------- #
# Wired today: trial --paid--> active.  Named-but-NOT-wired (webhook day):
# active->past_due, past_due->active, any->canceled.  `transition` returns None
# for anything not wired, so the named ones read as "refused" until they ship.
@pytest.mark.parametrize(
    ("state", "event", "expected"),
    [
        ("trial", "paid", "active"),              # the ONE wired transition of the day
        ("trial", "payment_failed", None),        # trial can't jump to past_due
        ("trial", "payment_recovered", None),
        ("trial", "unsubscribe", None),
        ("active", "payment_failed", None),       # named, not wired today
        ("active", "payment_recovered", None),
        ("active", "unsubscribe", None),
        ("past_due", "payment_recovered", None),  # named, not wired today
        ("past_due", "unsubscribe", None),
        ("canceled", "paid", None),               # terminal — nothing leaves canceled
        ("canceled", "payment_recovered", None),
        ("canceled", "unsubscribe", None),
    ],
)
def test_state_machine(state, event, expected):
    assert transition(state, event) == expected


# --------------------------------------------------------------------------- #
# 2. Signature verify — the ONE real-code seam (spec 2.4)
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
# 3. plan -> role — the conceptual spine (spec 2.5)
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
