# ADR-015 — Razorpay webhooks: a sealed delivery to the back of the house, and the ledger's full life

**Status:** Active
**Date:** 2026-10-22
**Deciders:** Ratnesh
**Supersedes:** — (completes ADR-014's named-but-not-wired state machine)
**Related:** [ADR-014](adr-014-razorpay-checkout.md) · [ADR-011](../../docs/adrs/adr-011-auth0-badge-reader.md) · [ADR-007](../../docs/adrs/adr-007-crud-error-contract-cascade.md) · [day-16 note](../notes/day-16-razorpay-webhooks-2026-10-22-1435.md)

## Context

ADR-014 built the cashier: a customer pays at the counter, the signature is checked, and the
ledger moves `trial → active`. But the ledger's *other* edges were only **named** (Decide-7),
never wired — a card that later bounces, a subscription that halts, a customer who cancels:
none of it could move the ledger, because nothing *told* the restaurant the money had moved.
Razorpay tells us by calling a URL. That URL is this ADR.

## Decision

### 1. The webhook is a public route — a sealed delivery, not a guest at the door

`POST /webhooks/razorpay` joins the lighthouse set (`PUBLIC_PATHS`) — it sits **outside** the
ADR-011 door, because Razorpay calls it with no badge. It is authenticated a *different* way:
Razorpay seals the **exact request bytes** with an HMAC-SHA256 stamp (`x-razorpay-signature`,
keyed by `RAZORPAY_WEBHOOK_SECRET`). The door, the key-ring, and every other route are
**untouched** — the delivery comes to the back of the house and is checked at the pass, not
admitted through the front.

### 2. The signature check is the day's one real-code seam — pure, on both tracks

`verify_webhook_signature(raw_body, secret, signature)` recomputes the HMAC over the raw body
and compares in constant time (no timing oracle). It is pure — no network, no cellar — the
same shape as the day-08 JWKS reader and ADR-014's `verify_signature`. **Fail-closed:** a
missing secret returns `503`, a missing or bad stamp returns `400 VerificationError` — the
ADR-007 receptionist, mirrored.

### 3. The full state machine is wired — the three edges ADR-014 only named

`TRANSITIONS` now carries every edge: `active → past_due` (`payment_failed`),
`past_due → active` (`paid` — the recovery), and `any → canceled` (`unsubscribe`). `canceled`
is terminal (empty row). The pure `transition(state, event)` is unchanged in shape — it just
has more rows — so the seam both kitchens' tests drive is the same one.

### 4. The event map translates the delivery note — the state table disambiguates

Razorpay speaks `event.name` (`payment.captured`, `subscription.halted`, …); `EVENT_MAP` maps
each to a machine event (`paid` / `payment_failed` / `unsubscribe`). The map is **static and
deliberately coarse** — the *same* `paid` means "activate" from `trial` but "recover" from
`past_due`; the state table, not the map, decides which. An unknown `event.name` is ignored
with a `200`, not an error.

### 5. Idempotent and always-200 — the restaurant never makes the courier re-drive

The route applies the transition and **always returns `200`** (except the `503`/`400` of §2).
A `(state, event)` pair not in the table is a no-op that still answers `200`, so Razorpay
does not retry a business-logic no-op. Re-delivery of the same event is harmless: the second
arrival finds the ledger already moved and does nothing.

### 6. The tier stays a derived projection — `past_due` keeps its keys

`apply_plan_transition` syncs `workspaces.plan_tier` from the new state: `active → starter`,
`canceled → free`, **`past_due → keep starter`**. A lapsed payer retains write access until
they *cancel* — the ADR-014 plan→role lift (a `member` on `starter` may write) is deliberately
not revoked on a bounce. That is a product choice, not a bug: a bounced card is a billing
hiccup, not a de-provisioning.

## Consequences

- **Positive:** the ledger now has a full life — it can activate, lapse, recover, and die —
  driven by the real courier, on both kitchens, with zero services (ADR-010 held; the seam is
  stubbed like the day-08 JWKS reader).
- **Positive:** the money path is closed. ADR-014's Decide-7 edges are no longer "named but
  not wired"; the only remaining Razorpay debt is the **live round-trip** (16a).
- **Negative:** a second, internet-facing authentication mechanism now exists (HMAC, not JWT).
  It is confined to the one webhook route and fails closed; but it is a new surface a future
  reader must know is *not* behind the door.
- **Negative / debt:** the **live** webhook (a real Razorpay test-mode event hitting a deployed
  route) is untested — like 16a, it rides along when a real charge is wanted. *Revisit-when:
  the first real charge.*

## References

- [ADR-014](adr-014-razorpay-checkout.md) — the cashier + ledger + the named-but-not-wired edges this ADR wires
- [ADR-011](../../docs/adrs/adr-011-auth0-badge-reader.md) — the door this route deliberately sits outside
- [ADR-007](../../docs/adrs/adr-007-crud-error-contract-cascade.md) — the receptionist (`VerificationError` 400, `ServiceUnavailable` 503)
- [day-16 note](../notes/day-16-razorpay-webhooks-2026-10-22-1435.md)
- [debt ledger](../../docs_v2/debt.md)
